import { describe, expect, it, vi } from 'vitest';

import { makeServerLogger } from '../../supabase/functions/_shared/logger';
import { mockOcrProvider } from '../../supabase/functions/_shared/llm/mock-providers';
import type { OCRProvider } from '../../supabase/functions/_shared/llm/types';
import { PG_UNIQUE_VIOLATION } from '../../supabase/functions/_shared/idempotency';
import { SpendingCapExceeded } from '../../supabase/functions/_shared/spending-cap';
import {
  ForbiddenHousehold,
  handle,
  MissingIdempotencyKey,
  RateLimited,
  type ReceiptDb,
  type ReceiptOcrDeps,
  type ReceiptRow,
} from '../../supabase/functions/receipt-ocr/handler';

function silentLogger() {
  return makeServerLogger({ console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } });
}

function makeRow(overrides: Partial<ReceiptRow> = {}): ReceiptRow {
  return {
    id: 'r-1',
    household_id: 'h-1',
    ocr_status: 'pending',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeDb(behavior: {
  insertResult: { data: ReceiptRow | null; error: { code?: string } | null };
  selectResult?: { data: ReceiptRow | null; error: unknown };
  isMember?: boolean;
}): ReceiptDb & {
  isHouseholdMember: ReturnType<typeof vi.fn>;
  insertReceipt: ReturnType<typeof vi.fn>;
  updateReceiptResult: ReturnType<typeof vi.fn>;
  updateReceiptFailed: ReturnType<typeof vi.fn>;
} {
  const updateReceiptResult = vi.fn().mockResolvedValue(undefined);
  const updateReceiptFailed = vi.fn().mockResolvedValue(undefined);
  return {
    isHouseholdMember: vi.fn().mockResolvedValue(behavior.isMember ?? true),
    insertReceipt: vi.fn().mockResolvedValue(behavior.insertResult),
    selectByKey: vi.fn().mockResolvedValue(behavior.selectResult ?? { data: null, error: null }),
    updateReceiptResult,
    updateReceiptFailed,
  };
}

function makeDeps(
  overrides: {
    db?: ReceiptDb;
    ocrChain?: readonly OCRProvider[];
    idempotencyKey?: string | null;
    now?: () => Date;
    stalledAfterMs?: number;
  } = {},
): ReceiptOcrDeps {
  const logger = silentLogger();
  const db = overrides.db ?? makeDb({ insertResult: { data: makeRow(), error: null } });
  const idempotencyKey =
    'idempotencyKey' in overrides ? (overrides.idempotencyKey ?? null) : 'idem-1';
  return {
    ctx: {
      user: { id: 'u-1' },
      logger,
      idempotencyKey,
    },
    db,
    ocrChain: overrides.ocrChain ?? [mockOcrProvider('mock-flash-lite')],
    spending: {
      redis: {
        get: vi.fn().mockResolvedValue(null),
        incrBy: vi.fn().mockResolvedValue(10),
        expire: vi.fn().mockResolvedValue(1),
      },
      logger,
      dailyCapCents: 1000,
      monthlyCapCents: 10000,
    },
    rateLimit: {
      redis: { incr: vi.fn().mockResolvedValue(1), expire: vi.fn().mockResolvedValue(1) },
      logger,
      windowSeconds: 60,
      maxPerWindow: 30,
    },
    ...(overrides.now !== undefined ? { now: overrides.now } : {}),
    ...(overrides.stalledAfterMs !== undefined ? { stalledAfterMs: overrides.stalledAfterMs } : {}),
  };
}

const REQ = { image_storage_key: 'pics/x.jpg', household_id: 'h-1' };

describe('receipt-ocr handler', () => {
  it('happy path inserts pending then writes ocr result and succeeds', async () => {
    const db = makeDb({ insertResult: { data: makeRow(), error: null } });
    const result = await handle(makeDeps({ db }), REQ);
    expect(result.status).toBe('succeeded');
    expect(result.created).toBe(true);
    expect(db.updateReceiptResult).toHaveBeenCalledWith(
      'r-1',
      'h-1',
      expect.objectContaining({ total_amount: expect.any(Number) }),
    );
    expect(db.updateReceiptFailed).not.toHaveBeenCalled();
  });

  it('duplicate idempotency key with succeeded existing returns it without re-running ocr', async () => {
    const existing = makeRow({ ocr_status: 'succeeded' });
    const db = makeDb({
      insertResult: { data: null, error: { code: PG_UNIQUE_VIOLATION } },
      selectResult: { data: existing, error: null },
    });
    const ocrSpy = vi.spyOn(mockOcrProvider('mock-flash-lite'), 'ocr');
    const result = await handle(
      makeDeps({ db, ocrChain: [mockOcrProvider('mock-flash-lite')] }),
      REQ,
    );
    expect(result).toEqual({ receipt_id: existing.id, status: 'succeeded', created: false });
    expect(db.updateReceiptResult).not.toHaveBeenCalled();
    expect(ocrSpy).not.toHaveBeenCalled();
  });

  it('duplicate key with fresh pending returns pending without re-running ocr', async () => {
    const now = new Date('2026-05-10T10:00:00Z');
    const existing = makeRow({
      ocr_status: 'pending',
      updated_at: new Date(now.getTime() - 60_000).toISOString(),
    });
    const db = makeDb({
      insertResult: { data: null, error: { code: PG_UNIQUE_VIOLATION } },
      selectResult: { data: existing, error: null },
    });
    const result = await handle(makeDeps({ db, now: () => now }), REQ);
    expect(result.status).toBe('pending');
    expect(result.created).toBe(false);
    expect(db.updateReceiptResult).not.toHaveBeenCalled();
  });

  it('duplicate key with stalled pending re-runs ocr', async () => {
    const now = new Date('2026-05-10T10:00:00Z');
    const stale = makeRow({
      ocr_status: 'pending',
      updated_at: new Date(now.getTime() - 10 * 60_000).toISOString(),
    });
    const db = makeDb({
      insertResult: { data: null, error: { code: PG_UNIQUE_VIOLATION } },
      selectResult: { data: stale, error: null },
    });
    const result = await handle(makeDeps({ db, now: () => now }), REQ);
    expect(result.status).toBe('succeeded');
    expect(result.created).toBe(false);
    expect(db.updateReceiptResult).toHaveBeenCalledOnce();
  });

  it('throws MissingIdempotencyKey when header absent', async () => {
    await expect(handle(makeDeps({ idempotencyKey: null }), REQ)).rejects.toBeInstanceOf(
      MissingIdempotencyKey,
    );
  });

  it('throws RateLimited before any membership check or insert', async () => {
    const db = makeDb({ insertResult: { data: makeRow(), error: null } });
    const deps = makeDeps({ db });
    const overLimit = { incr: vi.fn().mockResolvedValue(31), expire: vi.fn() };
    await expect(
      handle({ ...deps, rateLimit: { ...deps.rateLimit, redis: overLimit } }, REQ),
    ).rejects.toBeInstanceOf(RateLimited);
    expect(db.isHouseholdMember).not.toHaveBeenCalled();
    expect(db.insertReceipt).not.toHaveBeenCalled();
  });

  it('rejects a non-member before any insert', async () => {
    const db = makeDb({ insertResult: { data: makeRow(), error: null }, isMember: false });
    await expect(handle(makeDeps({ db }), REQ)).rejects.toBeInstanceOf(ForbiddenHousehold);
    expect(db.insertReceipt).not.toHaveBeenCalled();
    expect(db.updateReceiptResult).not.toHaveBeenCalled();
  });

  it('throws over cap and skips ocr without marking failed', async () => {
    const db = makeDb({ insertResult: { data: makeRow(), error: null } });
    const deps = makeDeps({ db });
    const overCap = { get: vi.fn().mockResolvedValue(5000), incrBy: vi.fn(), expire: vi.fn() };
    await expect(
      handle({ ...deps, spending: { ...deps.spending, redis: overCap } }, REQ),
    ).rejects.toBeInstanceOf(SpendingCapExceeded);
    expect(db.updateReceiptResult).not.toHaveBeenCalled();
    expect(db.updateReceiptFailed).not.toHaveBeenCalled();
  });

  it('marks failed when every provider in chain throws', async () => {
    const fail: OCRProvider = { name: 'fail', ocr: vi.fn().mockRejectedValue(new Error('boom')) };
    const db = makeDb({ insertResult: { data: makeRow(), error: null } });
    const result = await handle(makeDeps({ db, ocrChain: [fail] }), REQ);
    expect(result.status).toBe('failed');
    expect(db.updateReceiptFailed).toHaveBeenCalledOnce();
    expect(db.updateReceiptResult).not.toHaveBeenCalled();
  });

  it('still returns succeeded when post-ocr spend record fails', async () => {
    const db = makeDb({ insertResult: { data: makeRow(), error: null } });
    const failingRedis = {
      get: vi.fn().mockResolvedValue(null),
      incrBy: vi.fn().mockRejectedValue(new Error('redis down')),
      expire: vi.fn(),
    };
    const deps = makeDeps({ db });
    const result = await handle(
      { ...deps, spending: { ...deps.spending, redis: failingRedis } },
      REQ,
    );
    expect(result.status).toBe('succeeded');
    expect(db.updateReceiptFailed).not.toHaveBeenCalled();
  });
});
