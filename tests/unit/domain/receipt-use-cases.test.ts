import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { receiptCapReached, reconcileReceipt, type ReconcileLine } from '@domain/use-cases/receipt';
import { ENTITLEMENTS } from '@foundation/billing/entitlements';

function rpcStub(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  const supabase = { rpc } as unknown as Pick<SupabaseClient, 'rpc'>;
  return { supabase, rpc };
}

const line: ReconcileLine = {
  lineItemId: 'l-1',
  canonicalName: 'milk',
  displayName: 'Milk',
  category: 'dairy',
  quantity: 1,
  unit: 'each',
  lastUnitCost: 2,
};

describe('reconcileReceipt', () => {
  it('builds p_items and maps the result', async () => {
    const { supabase, rpc } = rpcStub({ data: { added: 2, skipped: 1 }, error: null });
    const result = await reconcileReceipt({ supabase }, 'r-1', [line]);
    expect(result).toEqual({ added: 2, skipped: 1 });
    expect(rpc).toHaveBeenCalledWith('reconcile_receipt', {
      p_receipt_id: 'r-1',
      p_items: [
        {
          line_item_id: 'l-1',
          canonical_name: 'milk',
          display_name: 'Milk',
          category: 'dairy',
          quantity: 1,
          unit: 'each',
          last_unit_cost: 2,
          expiration_date: null,
          estimated_expiration_days: null,
          is_frozen: false,
        },
      ],
    });
  });

  it('rejects an empty line list', async () => {
    const { supabase } = rpcStub({ data: null, error: null });
    await expect(reconcileReceipt({ supabase }, 'r-1', [])).rejects.toThrow('no_lines');
  });

  it('rejects an empty name', async () => {
    const { supabase } = rpcStub({ data: null, error: null });
    await expect(
      reconcileReceipt({ supabase }, 'r-1', [{ ...line, canonicalName: '  ' }]),
    ).rejects.toThrow('empty_line_name');
  });

  it('rejects a negative quantity', async () => {
    const { supabase } = rpcStub({ data: null, error: null });
    await expect(
      reconcileReceipt({ supabase }, 'r-1', [{ ...line, quantity: -1 }]),
    ).rejects.toThrow('invalid_quantity');
  });

  it('rejects a negative price', async () => {
    const { supabase } = rpcStub({ data: null, error: null });
    await expect(
      reconcileReceipt({ supabase }, 'r-1', [{ ...line, lastUnitCost: -1 }]),
    ).rejects.toThrow('invalid_price');
  });

  it('surfaces an rpc error', async () => {
    const { supabase } = rpcStub({ data: null, error: { message: 'boom' } });
    await expect(reconcileReceipt({ supabase }, 'r-1', [line])).rejects.toEqual({
      message: 'boom',
    });
  });
});

describe('receiptCapReached', () => {
  it('is false below the cap', () => {
    expect(receiptCapReached(7, 8)).toBe(false);
  });

  it('is true at the cap', () => {
    expect(receiptCapReached(8, 8)).toBe(true);
  });

  it('is true above the cap', () => {
    expect(receiptCapReached(9, 8)).toBe(true);
  });

  it('is false for an unlimited tier', () => {
    expect(receiptCapReached(9999, ENTITLEMENTS.solo_monthly.receipts_per_month)).toBe(false);
  });
});
