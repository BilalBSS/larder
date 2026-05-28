// / receipt ocr handler
import { idempotentInsert, type InsertOutcome, type SelectOutcome } from '../_shared/idempotency';
import type { RequestContext } from '../_shared/context';
import type { ServerLogger } from '../_shared/logger';
import type { OCRProvider, ServerOCRLineItem } from '../_shared/llm/types';
import { runOcr } from '../_shared/llm/router';
import {
  record as recordSpend,
  SpendingCapExceeded,
  SpendingCapUnavailable,
  type SpendingRedis,
} from '../_shared/spending-cap';

export interface ReceiptOcrRequest {
  readonly image_storage_key: string;
  readonly household_id: string;
}

export interface ReceiptOcrResponse {
  readonly receipt_id: string;
  readonly status: 'pending' | 'succeeded' | 'failed';
  readonly line_items?: readonly ServerOCRLineItem[];
  readonly created: boolean;
}

export interface ReceiptRow {
  readonly id: string;
  readonly household_id: string;
  readonly ocr_status: 'pending' | 'succeeded' | 'failed' | 'partial';
  readonly updated_at: string;
}

export interface ReceiptOcrUpdate {
  readonly total_amount: number;
  readonly tax_amount: number | null;
  readonly confidence: number;
  readonly line_items: readonly ServerOCRLineItem[];
}

export interface ReceiptDb {
  isHouseholdMember(input: {
    readonly household_id: string;
    readonly user_id: string;
  }): Promise<boolean>;
  insertReceipt(input: {
    readonly household_id: string;
    readonly idempotency_key: string;
    readonly image_storage_key: string;
    readonly user_id: string;
  }): Promise<InsertOutcome<ReceiptRow>>;
  selectByKey(input: {
    readonly household_id: string;
    readonly idempotency_key: string;
  }): Promise<SelectOutcome<ReceiptRow>>;
  updateReceiptResult(id: string, result: ReceiptOcrUpdate): Promise<void>;
  updateReceiptFailed(id: string): Promise<void>;
}

export interface ReceiptOcrDeps {
  readonly ctx: RequestContext;
  readonly db: ReceiptDb;
  readonly ocrChain: readonly OCRProvider[];
  readonly spending: {
    readonly redis: SpendingRedis;
    readonly logger: ServerLogger;
    readonly dailyCapCents: number;
    readonly monthlyCapCents: number;
  };
  readonly stalledAfterMs?: number;
  readonly now?: () => Date;
}

export class MissingIdempotencyKey extends Error {
  constructor() {
    super('missing_idempotency_key');
    this.name = 'MissingIdempotencyKey';
  }
}

export class ForbiddenHousehold extends Error {
  constructor() {
    super('forbidden_household');
    this.name = 'ForbiddenHousehold';
  }
}

const DEFAULT_STALLED_AFTER_MS = 5 * 60 * 1000;

export async function handle(
  deps: ReceiptOcrDeps,
  req: ReceiptOcrRequest,
): Promise<ReceiptOcrResponse> {
  const { ctx } = deps;
  const idempotencyKey = ctx.idempotencyKey;
  if (idempotencyKey === null) throw new MissingIdempotencyKey();

  const member = await deps.db.isHouseholdMember({
    household_id: req.household_id,
    user_id: ctx.user.id,
  });
  if (!member) throw new ForbiddenHousehold();

  const insertResult = await idempotentInsert<ReceiptRow>({
    insert: () =>
      deps.db.insertReceipt({
        household_id: req.household_id,
        idempotency_key: idempotencyKey,
        image_storage_key: req.image_storage_key,
        user_id: ctx.user.id,
      }),
    selectExisting: () =>
      deps.db.selectByKey({
        household_id: req.household_id,
        idempotency_key: idempotencyKey,
      }),
  });

  const now = deps.now === undefined ? new Date() : deps.now();
  const stalledAfter = deps.stalledAfterMs ?? DEFAULT_STALLED_AFTER_MS;

  if (!insertResult.created) {
    const existing = insertResult.row;
    if (existing.ocr_status !== 'pending') {
      return {
        receipt_id: existing.id,
        status: existing.ocr_status === 'partial' ? 'succeeded' : existing.ocr_status,
        created: false,
      };
    }
    const age = now.getTime() - new Date(existing.updated_at).getTime();
    if (age <= stalledAfter) {
      return { receipt_id: existing.id, status: 'pending', created: false };
    }
  }

  const row = insertResult.row;
  let ocrLineItems: readonly ServerOCRLineItem[];
  try {
    const ocrResult = await runOcr(
      { ocrChain: deps.ocrChain, recipesChain: [], logger: ctx.logger },
      { image_storage_key: req.image_storage_key },
    );
    await deps.db.updateReceiptResult(row.id, {
      total_amount: ocrResult.total_amount,
      tax_amount: ocrResult.tax_amount,
      confidence: ocrResult.confidence,
      line_items: ocrResult.line_items,
    });
    ocrLineItems = ocrResult.line_items;
    await recordSpendBestEffort(deps, ctx.logger, ocrResult.cost_usd_cents, ctx.user.id);
  } catch (err) {
    ctx.logger.error('receipt_ocr_failed', err);
    await deps.db.updateReceiptFailed(row.id);
    return { receipt_id: row.id, status: 'failed', created: insertResult.created };
  }

  return {
    receipt_id: row.id,
    status: 'succeeded',
    line_items: ocrLineItems,
    created: insertResult.created,
  };
}

async function recordSpendBestEffort(
  deps: ReceiptOcrDeps,
  logger: ServerLogger,
  amount_usd_cents: number,
  user_id: string,
): Promise<void> {
  try {
    await recordSpend(
      { redis: deps.spending.redis, logger: deps.spending.logger },
      {
        user_id,
        amount_usd_cents,
        daily_cap_cents: deps.spending.dailyCapCents,
        monthly_cap_cents: deps.spending.monthlyCapCents,
      },
    );
  } catch (err) {
    if (err instanceof SpendingCapExceeded || err instanceof SpendingCapUnavailable) {
      logger.warn('spend_record_post_ocr_failed', { user_id });
      return;
    }
    throw err;
  }
}
