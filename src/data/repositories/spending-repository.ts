// / spending read model
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  parseLineItemRow,
  parseReceiptRow,
  rowToLineItem,
  rowToReceipt,
} from '@data/dtos/receipt-dto';
import type { Receipt } from '@domain/entities/receipt';
import type { ReceiptLineItem } from '@domain/entities/receipt-line-item';

export const SPEND_STATUSES = ['succeeded', 'partial'] as const;

export interface SpendingRepository {
  listReceiptsBetween(householdId: string, fromIso: string, toIso: string): Promise<Receipt[]>;
  listLineItemsByReceiptIds(householdId: string, receiptIds: string[]): Promise<ReceiptLineItem[]>;
}

export interface SpendingRepositoryDeps {
  readonly supabase: Pick<SupabaseClient, 'from'>;
}

export function makeSpendingRepository(deps: SpendingRepositoryDeps): SpendingRepository {
  return {
    async listReceiptsBetween(householdId, fromIso, toIso) {
      const { data, error } = await deps.supabase
        .from('receipts')
        .select('*')
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .in('ocr_status', [...SPEND_STATUSES])
        .gte('purchased_at', fromIso)
        .lt('purchased_at', toIso)
        .order('purchased_at', { ascending: false });
      if (error !== null) throw error;
      return ((data ?? []) as unknown[]).map((row) => rowToReceipt(parseReceiptRow(row)));
    },

    async listLineItemsByReceiptIds(householdId, receiptIds) {
      if (receiptIds.length === 0) return [];
      const { data, error } = await deps.supabase
        .from('receipt_line_items')
        .select('*')
        .eq('household_id', householdId)
        .in('receipt_id', receiptIds);
      if (error !== null) throw error;
      return ((data ?? []) as unknown[]).map((row) => rowToLineItem(parseLineItemRow(row)));
    },
  };
}
