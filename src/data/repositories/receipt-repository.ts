// / receipt repository
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  parseLineItemRow,
  parseReceiptRow,
  rowToLineItem,
  rowToReceipt,
} from '@data/dtos/receipt-dto';
import type { Receipt } from '@domain/entities/receipt';
import type { ReceiptLineItem } from '@domain/entities/receipt-line-item';

export interface ReceiptWithLines {
  receipt: Receipt;
  lineItems: ReceiptLineItem[];
}

export interface ReceiptRepository {
  get(receiptId: string): Promise<ReceiptWithLines | null>;
  countThisMonth(householdId: string): Promise<number>;
}

export interface ReceiptRepositoryDeps {
  readonly supabase: Pick<SupabaseClient, 'from'>;
}

// / utc first of month
function monthStartIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function makeReceiptRepository(deps: ReceiptRepositoryDeps): ReceiptRepository {
  return {
    async get(receiptId) {
      const receiptRes = await deps.supabase
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .is('deleted_at', null)
        .maybeSingle();
      if (receiptRes.error !== null) throw receiptRes.error;
      if (receiptRes.data === null) return null;
      const linesRes = await deps.supabase
        .from('receipt_line_items')
        .select('*')
        .eq('receipt_id', receiptId)
        .order('created_at', { ascending: true });
      if (linesRes.error !== null) throw linesRes.error;
      const lineRows = (linesRes.data ?? []) as unknown[];
      return {
        receipt: rowToReceipt(parseReceiptRow(receiptRes.data)),
        lineItems: lineRows.map((row) => rowToLineItem(parseLineItemRow(row))),
      };
    },

    async countThisMonth(householdId) {
      const { count, error } = await deps.supabase
        .from('receipts')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .gte('created_at', monthStartIso(new Date()));
      if (error !== null) throw error;
      if (count === null) throw new Error('receipt_count_unavailable');
      return count;
    },
  };
}
