// / reconcile receipt lines
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export interface ReconcileLine {
  lineItemId?: string | null;
  canonicalName: string;
  displayName: string;
  category: string;
  quantity: number;
  unit: string;
  lastUnitCost?: number | null;
  expirationDate?: string | null;
  estimatedExpirationDays?: number | null;
  isFrozen?: boolean;
}

export interface ReconcileResult {
  added: number;
  skipped: number;
}

export interface ReconcileDeps {
  readonly supabase: Pick<SupabaseClient, 'rpc'>;
}

const ResultSchema = z.object({ added: z.number(), skipped: z.number() });

export async function reconcileReceipt(
  deps: ReconcileDeps,
  receiptId: string,
  lines: ReconcileLine[],
): Promise<ReconcileResult> {
  if (lines.length === 0) throw new Error('no_lines');
  for (const line of lines) {
    if (line.canonicalName.trim() === '' || line.displayName.trim() === '') {
      throw new Error('empty_line_name');
    }
    if (line.quantity < 0) throw new Error('invalid_quantity');
    if (typeof line.lastUnitCost === 'number' && line.lastUnitCost < 0) {
      throw new Error('invalid_price');
    }
  }
  const p_items = lines.map((line) => ({
    line_item_id: line.lineItemId ?? null,
    canonical_name: line.canonicalName,
    display_name: line.displayName,
    category: line.category,
    quantity: line.quantity,
    unit: line.unit,
    last_unit_cost: line.lastUnitCost ?? null,
    expiration_date: line.expirationDate ?? null,
    estimated_expiration_days: line.estimatedExpirationDays ?? null,
    is_frozen: line.isFrozen ?? false,
  }));
  const { data, error } = await deps.supabase.rpc('reconcile_receipt', {
    p_receipt_id: receiptId,
    p_items,
  });
  if (error !== null) throw error;
  return ResultSchema.parse(data);
}
