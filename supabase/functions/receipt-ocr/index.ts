// / receipt ocr edge entry
// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Redis } from 'npm:@upstash/redis@1';

import { makeRequestContext } from '../_shared/context.ts';
import { AttestationFailed } from '../_shared/attestation.ts';
import { makeServerLogger } from '../_shared/logger.ts';
import { makeGeminiOcrProvider } from '../_shared/llm/gemini-ocr-provider.ts';
import { mockOcrProvider } from '../_shared/llm/mock-providers.ts';
import { SpendingCapExceeded, SpendingCapUnavailable } from '../_shared/spending-cap.ts';
import {
  ForbiddenHousehold,
  handle,
  MissingIdempotencyKey,
  RateLimited,
  ReceiptCapExceeded,
  type ReceiptOcrRequest,
} from './handler.ts';

function numEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`invalid_env:${name}`);
  return n;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const UPSTASH_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
const DAILY_CAP_CENTS = numEnv('LLM_DAILY_CAP_CENTS', 500);
const MONTHLY_CAP_CENTS = numEnv('LLM_MONTHLY_CAP_CENTS', 5000);
const RATE_WINDOW_SECONDS = numEnv('RECEIPT_OCR_RATE_WINDOW_SECONDS', 60);
const RATE_MAX_PER_WINDOW = numEnv('RECEIPT_OCR_RATE_MAX', 30);
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') ?? 'development';
const ATTESTATION_ENFORCED = (Deno.env.get('ATTESTATION_ENFORCED') ?? 'false') === 'true';
const ATTESTATION_ALLOW_DEV_STUB =
  (Deno.env.get('ATTESTATION_ALLOW_DEV_STUB') ?? 'true') === 'true';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_PRIMARY_MODEL = Deno.env.get('GEMINI_PRIMARY_MODEL') ?? 'gemini-flash-lite-latest';
const GEMINI_FALLBACK_MODEL = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-flash-latest';

if (
  SUPABASE_URL === undefined ||
  SERVICE_ROLE === undefined ||
  UPSTASH_URL === undefined ||
  UPSTASH_TOKEN === undefined
) {
  throw new Error('missing_secrets');
}

if (ENVIRONMENT === 'production' && ATTESTATION_ALLOW_DEV_STUB) {
  throw new Error('insecure_attestation_config');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
const redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
const baseLogger = makeServerLogger({ console }, { fn: 'receipt-ocr' });

const receiptStorage = supabase.storage.from('receipts');
const ocrChain =
  GEMINI_API_KEY === undefined
    ? [mockOcrProvider('mock-flash-lite'), mockOcrProvider('mock-flash')]
    : [
        makeGeminiOcrProvider({
          apiKey: GEMINI_API_KEY,
          model: GEMINI_PRIMARY_MODEL,
          storage: receiptStorage,
        }),
        makeGeminiOcrProvider({
          apiKey: GEMINI_API_KEY,
          model: GEMINI_FALLBACK_MODEL,
          storage: receiptStorage,
        }),
      ];

Deno.serve(async (req) => {
  const logger = baseLogger;
  try {
    const ctx = makeRequestContext({
      headers: req.headers,
      baseLogger,
      attestation: { enforced: ATTESTATION_ENFORCED, allowDevStub: ATTESTATION_ALLOW_DEV_STUB },
    });
    const body = (await req.json()) as ReceiptOcrRequest;
    const result = await handle(
      {
        ctx,
        db: {
          async isHouseholdMember(input) {
            const res = await supabase
              .from('household_members')
              .select('user_id')
              .eq('household_id', input.household_id)
              .eq('user_id', input.user_id)
              .is('deleted_at', null)
              .maybeSingle();
            if (res.error) throw res.error;
            return res.data !== null;
          },
          async resolveTier(user_id) {
            const res = await supabase
              .from('subscriptions')
              .select('tier')
              .eq('user_id', user_id)
              .maybeSingle();
            if (res.error) throw res.error;
            return res.data?.tier ?? null;
          },
          async receiptsThisMonth(input) {
            const now = new Date();
            const monthStart = new Date(
              Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
            ).toISOString();
            const res = await supabase
              .from('receipts')
              .select('id', { count: 'exact', head: true })
              .eq('household_id', input.household_id)
              .is('deleted_at', null)
              .gte('created_at', monthStart)
              .neq('ocr_status', 'failed')
              .neq('idempotency_key', input.exclude_idempotency_key);
            if (res.error) throw res.error;
            if (res.count === null) throw new Error('receipt_count_unavailable');
            return res.count;
          },
          async insertReceipt(input) {
            const res = await supabase
              .from('receipts')
              .insert({
                household_id: input.household_id,
                idempotency_key: input.idempotency_key,
                photo_storage_key: input.image_storage_key,
                scanned_by_user_id: input.user_id,
                ocr_status: 'pending',
                total_amount: 0,
                purchased_at: new Date().toISOString(),
              })
              .select('id, household_id, ocr_status, updated_at')
              .single();
            return { data: res.data, error: res.error };
          },
          async selectByKey(input) {
            const res = await supabase
              .from('receipts')
              .select('id, household_id, ocr_status, updated_at')
              .eq('household_id', input.household_id)
              .eq('idempotency_key', input.idempotency_key)
              .single();
            return { data: res.data, error: res.error };
          },
          async claimStalled(input) {
            const res = await supabase
              .from('receipts')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', input.id)
              .eq('ocr_status', 'pending')
              .eq('updated_at', input.observed_updated_at)
              .select('id');
            if (res.error) throw res.error;
            return (res.data?.length ?? 0) > 0;
          },
          async updateReceiptResult(id, household_id, result) {
            const upd = await supabase
              .from('receipts')
              .update({
                ocr_status: 'succeeded',
                store_name: result.store_name,
                total_amount: result.total_amount,
                tax_amount: result.tax_amount,
                purchased_at: result.purchased_at ?? new Date().toISOString(),
                ocr_confidence: result.confidence,
              })
              .eq('id', id);
            if (upd.error) throw upd.error;
            const del = await supabase.from('receipt_line_items').delete().eq('receipt_id', id);
            if (del.error) throw del.error;
            const ins = await supabase.from('receipt_line_items').insert(
              result.line_items.map((li) => ({
                receipt_id: id,
                household_id,
                raw_text: li.raw_text,
                canonical_name: li.canonical_name,
                category: li.category,
                quantity: li.quantity,
                unit: li.unit,
                unit_price: li.unit_price,
                line_total: li.line_total,
              })),
            );
            if (ins.error) throw ins.error;
          },
          async updateReceiptFailed(id) {
            const res = await supabase
              .from('receipts')
              .update({ ocr_status: 'failed' })
              .eq('id', id);
            if (res.error) throw res.error;
          },
        },
        ocrChain,
        spending: {
          redis,
          logger,
          dailyCapCents: DAILY_CAP_CENTS,
          monthlyCapCents: MONTHLY_CAP_CENTS,
        },
        rateLimit: {
          redis,
          logger,
          windowSeconds: RATE_WINDOW_SECONDS,
          maxPerWindow: RATE_MAX_PER_WINDOW,
        },
      },
      body,
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof MissingIdempotencyKey) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (err instanceof ForbiddenHousehold || err instanceof AttestationFailed) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (err instanceof RateLimited) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': String(err.retryAfterSeconds),
        },
      });
    }
    if (err instanceof ReceiptCapExceeded || err instanceof SpendingCapExceeded) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (err instanceof SpendingCapUnavailable) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      });
    }
    logger.error('receipt_ocr_unhandled', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
