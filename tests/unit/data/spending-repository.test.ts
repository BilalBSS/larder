import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { makeSpendingRepository } from '@data/repositories/spending-repository';

interface Result {
  readonly data: unknown;
  readonly error: unknown;
}

interface Call {
  readonly method: string;
  readonly args: unknown[];
}

const METHODS = ['select', 'eq', 'is', 'in', 'gte', 'lt', 'order'] as const;

function stub(result: Result) {
  const calls: Call[] = [];
  let fromCount = 0;
  const make = () => {
    const builder: Record<string, unknown> = {};
    for (const method of METHODS) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return builder;
      };
    }
    builder['then'] = (resolve: (value: Result) => void) => resolve(result);
    return builder;
  };
  const supabase = {
    from: () => {
      fromCount += 1;
      return make();
    },
  } as unknown as Pick<SupabaseClient, 'from'>;
  return { supabase, calls, fromCalls: () => fromCount };
}

const receiptRow = {
  id: 'r-1',
  household_id: 'h-1',
  scanned_by_user_id: 'u-1',
  store_name: 'Aldi',
  total_amount: 24,
  tax_amount: null,
  purchased_at: '2026-06-02T00:00:00.000Z',
  ocr_status: 'succeeded',
  ocr_confidence: 0.9,
  reconciled_at: null,
  created_at: '2026-06-02T10:00:00.000Z',
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

describe('spendingRepository.listReceiptsBetween', () => {
  it('windows live spend receipts by purchase date', async () => {
    const { supabase, calls } = stub({ data: [receiptRow], error: null });
    const repo = makeSpendingRepository({ supabase });
    const receipts = await repo.listReceiptsBetween(
      'h-1',
      '2026-01-01T00:00:00.000Z',
      '2026-07-01T00:00:00.000Z',
    );
    expect(receipts[0]).toMatchObject({ id: 'r-1', totalAmount: 24 });
    expect(calls).toContainEqual({ method: 'eq', args: ['household_id', 'h-1'] });
    expect(calls).toContainEqual({ method: 'is', args: ['deleted_at', null] });
    expect(calls).toContainEqual({ method: 'in', args: ['ocr_status', ['succeeded', 'partial']] });
    expect(calls).toContainEqual({
      method: 'gte',
      args: ['purchased_at', '2026-01-01T00:00:00.000Z'],
    });
    expect(calls).toContainEqual({
      method: 'lt',
      args: ['purchased_at', '2026-07-01T00:00:00.000Z'],
    });
    expect(calls).toContainEqual({ method: 'order', args: ['purchased_at', { ascending: false }] });
  });

  it('throws when the read errors', async () => {
    const { supabase } = stub({ data: null, error: { message: 'boom' } });
    const repo = makeSpendingRepository({ supabase });
    await expect(repo.listReceiptsBetween('h-1', 'a', 'b')).rejects.toEqual({ message: 'boom' });
  });
});

describe('spendingRepository.listLineItemsByReceiptIds', () => {
  it('fetches lines scoped to household and receipts', async () => {
    const { supabase, calls } = stub({ data: [lineRow], error: null });
    const repo = makeSpendingRepository({ supabase });
    const lines = await repo.listLineItemsByReceiptIds('h-1', ['r-1', 'r-2']);
    expect(lines[0]).toMatchObject({ category: 'dairy', lineTotal: 2 });
    expect(calls).toContainEqual({ method: 'eq', args: ['household_id', 'h-1'] });
    expect(calls).toContainEqual({ method: 'in', args: ['receipt_id', ['r-1', 'r-2']] });
  });

  it('short-circuits on an empty id list', async () => {
    const { supabase, fromCalls } = stub({ data: [], error: null });
    const repo = makeSpendingRepository({ supabase });
    expect(await repo.listLineItemsByReceiptIds('h-1', [])).toEqual([]);
    expect(fromCalls()).toBe(0);
  });
});
