// / receipt row dtos
import { z } from 'zod';

import type { Receipt } from '@domain/entities/receipt';
import type { ReceiptLineItem } from '@domain/entities/receipt-line-item';

export const ReceiptRowSchema = z.object({
  id: z.string(),
  household_id: z.string(),
  scanned_by_user_id: z.string(),
  store_name: z.string().nullable(),
  total_amount: z.number(),
  tax_amount: z.number().nullable(),
  purchased_at: z.string(),
  ocr_status: z.enum(['pending', 'succeeded', 'failed', 'partial']),
  ocr_confidence: z.number().nullable(),
  reconciled_at: z.string().nullable(),
  created_at: z.string(),
});

export type ReceiptRow = z.infer<typeof ReceiptRowSchema>;

export const ReceiptLineItemRowSchema = z.object({
  id: z.string(),
  receipt_id: z.string(),
  household_id: z.string(),
  raw_text: z.string(),
  canonical_name: z.string().nullable(),
  category: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  unit_price: z.number().nullable(),
  line_total: z.number(),
  pantry_item_id: z.string().nullable(),
});

export type ReceiptLineItemRow = z.infer<typeof ReceiptLineItemRowSchema>;

export function rowToReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    householdId: row.household_id,
    scannedByUserId: row.scanned_by_user_id,
    storeName: row.store_name,
    totalAmount: row.total_amount,
    taxAmount: row.tax_amount,
    purchasedAt: row.purchased_at,
    ocrStatus: row.ocr_status,
    ocrConfidence: row.ocr_confidence,
    reconciledAt: row.reconciled_at,
    createdAt: row.created_at,
  };
}

export function rowToLineItem(row: ReceiptLineItemRow): ReceiptLineItem {
  return {
    id: row.id,
    receiptId: row.receipt_id,
    householdId: row.household_id,
    rawText: row.raw_text,
    canonicalName: row.canonical_name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
    pantryItemId: row.pantry_item_id,
  };
}

export function parseReceiptRow(raw: unknown): ReceiptRow {
  return ReceiptRowSchema.parse(raw);
}

export function parseLineItemRow(raw: unknown): ReceiptLineItemRow {
  return ReceiptLineItemRowSchema.parse(raw);
}
