// / receipt ocr edge entry
// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Redis } from 'npm:@upstash/redis@1';

import { makeRequestContext } from '../_shared/context.ts';
import { makeServerLogger } from '../_shared/logger.ts';
import { mockOcrProvider } from '../_shared/llm/mock-providers.ts';
import { handle, MissingIdempotencyKey, type ReceiptOcrRequest } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const UPSTASH_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
const DAILY_CAP_CENTS = Number(Deno.env.get('LLM_DAILY_CAP_CENTS') ?? '500');
const MONTHLY_CAP_CENTS = Number(Deno.env.get('LLM_MONTHLY_CAP_CENTS') ?? '5000');

if (
  SUPABASE_URL === undefined ||
  SERVICE_ROLE === undefined ||
  UPSTASH_URL === undefined ||
  UPSTASH_TOKEN === undefined
) {
  throw new Error('missing_secrets');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
const redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
const baseLogger = makeServerLogger({ console }, { fn: 'receipt-ocr' });

Deno.serve(async (req) => {
  const logger = baseLogger;
  try {
    const ctx = makeRequestContext({ headers: req.headers, baseLogger });
    const body = (await req.json()) as ReceiptOcrRequest;
    const result = await handle(
      {
        ctx,
        db: {
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
          async updateReceiptResult(id, result) {
            await supabase
              .from('receipts')
              .update({
                ocr_status: 'succeeded',
                total_amount: result.total_amount,
                tax_amount: result.tax_amount,
                ocr_confidence: result.confidence,
              })
              .eq('id', id);
            await supabase
              .from('receipt_line_items')
              .insert(result.line_items.map((li) => ({ receipt_id: id, ...li })));
          },
          async updateReceiptFailed(id) {
            await supabase.from('receipts').update({ ocr_status: 'failed' }).eq('id', id);
          },
        },
        ocrChain: [mockOcrProvider('mock-flash-lite'), mockOcrProvider('mock-flash')],
        spending: {
          redis,
          logger,
          dailyCapCents: DAILY_CAP_CENTS,
          monthlyCapCents: MONTHLY_CAP_CENTS,
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
    logger.error('receipt_ocr_unhandled', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
