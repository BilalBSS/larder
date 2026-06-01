// / wired receipt service
import {
  makeReceiptRepository,
  type ReceiptWithLines,
} from '@data/repositories/receipt-repository';
import { supabase } from '@foundation/auth/supabase';

import { reconcileReceipt, type ReconcileLine, type ReconcileResult } from './reconcile';

export interface ReceiptService {
  get(receiptId: string): Promise<ReceiptWithLines | null>;
  countThisMonth(householdId: string): Promise<number>;
  reconcile(receiptId: string, lines: ReconcileLine[]): Promise<ReconcileResult>;
}

const repo = makeReceiptRepository({ supabase });

export const receiptService: ReceiptService = {
  get: (receiptId) => repo.get(receiptId),
  countThisMonth: (householdId) => repo.countThisMonth(householdId),
  reconcile: (receiptId, lines) => reconcileReceipt({ supabase }, receiptId, lines),
};
