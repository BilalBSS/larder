// / wired receipt service
import {
  makeReceiptRepository,
  type ReceiptWithLines,
} from '@data/repositories/receipt-repository';
import type { Receipt } from '@domain/entities/receipt';
import { supabase } from '@foundation/auth/supabase';

import { reconcileReceipt, type ReconcileLine, type ReconcileResult } from './reconcile';

export interface ReceiptService {
  get(receiptId: string): Promise<ReceiptWithLines | null>;
  countThisMonth(householdId: string): Promise<number>;
  list(householdId: string, limit: number): Promise<Receipt[]>;
  reconcile(receiptId: string, lines: ReconcileLine[]): Promise<ReconcileResult>;
}

const repo = makeReceiptRepository({ supabase });

export const receiptService: ReceiptService = {
  get: (receiptId) => repo.get(receiptId),
  countThisMonth: (householdId) => repo.countThisMonth(householdId),
  list: (householdId, limit) => repo.list(householdId, limit),
  reconcile: (receiptId, lines) => reconcileReceipt({ supabase }, receiptId, lines),
};
