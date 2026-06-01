import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { makeReceiptRepository } from '@data/repositories/receipt-repository';

interface Result {
  readonly data?: unknown;
  readonly count?: number | null;
  readonly error: unknown;
}

interface Calls {
  select: unknown[][];
  eq: unknown[][];
  is: unknown[][];
  gte: unknown[][];
  order: unknown[][];
}

function stub(byTable: Record<string, Result>) {
  const calls: Calls = { select: [], eq: [], is: [], gte: [], order: [] };
  const make = (result: Result) => {
    const builder = {
      select: (...args: unknown[]) => {
        calls.select.push(args);
        return builder;
      },
      eq: (...args: unknown[]) => {
        calls.eq.push(args);
        return builder;
      },
      is: (...args: unknown[]) => {
        calls.is.push(args);
        return builder;
      },
      gte: (...args: unknown[]) => {
        calls.gte.push(args);
        return Promise.resolve(result);
      },
      order: (...args: unknown[]) => {
        calls.order.push(args);
        return Promise.resolve(result);
      },
      maybeSingle: () => Promise.resolve(result),
    };
    return builder;
  };
  const supabase = {
    from: (table: string) => make(byTable[table] ?? { data: null, error: null }),
  } as unknown as Pick<SupabaseClient, 'from'>;
  return { supabase, calls };
}

const receiptRow = {
  id: 'r-1',
  household_id: 'h-1',
  scanned_by_user_id: 'u-1',
  store_name: 'Tesco',
  total_amount: 12.5,
  tax_amount: null,
  purchased_at: '2026-05-10T00:00:00.000Z',
  ocr_status: 'succeeded',
  ocr_confidence: 0.9,
  reconciled_at: null,
  created_at: '2026-05-10T00:00:00.000Z',
};

const lineRow = {
  id: 'l-1',
  receipt_id: 'r-1',
  household_id: 'h-1',
  raw_text: 'MILK',
  canonical_name: 'milk',
  category: 'dairy',
  quantity: 1,
  unit: 'each',
  unit_price: 2,
  line_total: 2,
  pantry_item_id: null,
};

describe('receiptRepository.get', () => {
  it('returns the receipt with its line items, scoped to live rows', async () => {
    const { supabase, calls } = stub({
      receipts: { data: receiptRow, error: null },
      receipt_line_items: { data: [lineRow], error: null },
    });
    const repo = makeReceiptRepository({ supabase });
    const result = await repo.get('r-1');
    expect(result?.receipt).toMatchObject({ id: 'r-1', storeName: 'Tesco', totalAmount: 12.5 });
    expect(result?.lineItems).toHaveLength(1);
    expect(result?.lineItems[0]).toMatchObject({ canonicalName: 'milk', lineTotal: 2 });
    expect(calls.eq).toContainEqual(['id', 'r-1']);
    expect(calls.is).toContainEqual(['deleted_at', null]);
    expect(calls.eq).toContainEqual(['receipt_id', 'r-1']);
  });

  it('returns null when the receipt is missing', async () => {
    const { supabase } = stub({ receipts: { data: null, error: null } });
    const repo = makeReceiptRepository({ supabase });
    expect(await repo.get('missing')).toBeNull();
  });

  it('throws when the receipt query errors', async () => {
    const { supabase } = stub({ receipts: { data: null, error: { message: 'boom' } } });
    const repo = makeReceiptRepository({ supabase });
    await expect(repo.get('r-1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('receiptRepository.countThisMonth', () => {
  it('counts live rows since the start of the month', async () => {
    const { supabase, calls } = stub({ receipts: { count: 3, error: null } });
    const repo = makeReceiptRepository({ supabase });
    expect(await repo.countThisMonth('h-1')).toBe(3);
    expect(calls.select[0]).toEqual(['id', { count: 'exact', head: true }]);
    expect(calls.is).toContainEqual(['deleted_at', null]);
    expect(calls.gte[0]?.[0]).toBe('created_at');
    expect(calls.gte[0]?.[1]).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);
  });

  it('throws rather than coalescing a null count', async () => {
    const { supabase } = stub({ receipts: { count: null, error: null } });
    const repo = makeReceiptRepository({ supabase });
    await expect(repo.countThisMonth('h-1')).rejects.toThrow('receipt_count_unavailable');
  });

  it('throws when the count query errors', async () => {
    const { supabase } = stub({ receipts: { count: null, error: { message: 'down' } } });
    const repo = makeReceiptRepository({ supabase });
    await expect(repo.countThisMonth('h-1')).rejects.toEqual({ message: 'down' });
  });
});
