import { describe, expect, it } from 'vitest';

import {
  parseLineItemRow,
  parseReceiptRow,
  rowToLineItem,
  rowToReceipt,
} from '@data/dtos/receipt-dto';

const receiptRow = {
  id: 'r-1',
  household_id: 'h-1',
  scanned_by_user_id: 'u-1',
  store_name: 'Tesco',
  total_amount: 12.5,
  tax_amount: 1.2,
  purchased_at: '2026-05-10T00:00:00.000Z',
  ocr_status: 'succeeded',
  ocr_confidence: 0.92,
  reconciled_at: null,
  created_at: '2026-05-10T00:00:00.000Z',
};

describe('parseReceiptRow', () => {
  it('maps a full row to the entity with numeric amounts', () => {
    const receipt = rowToReceipt(parseReceiptRow(receiptRow));
    expect(receipt).toMatchObject({
      id: 'r-1',
      householdId: 'h-1',
      scannedByUserId: 'u-1',
      storeName: 'Tesco',
      totalAmount: 12.5,
      taxAmount: 1.2,
      ocrStatus: 'succeeded',
      ocrConfidence: 0.92,
      reconciledAt: null,
    });
  });

  it('accepts null store, tax, and confidence', () => {
    const receipt = rowToReceipt(
      parseReceiptRow({ ...receiptRow, store_name: null, tax_amount: null, ocr_confidence: null }),
    );
    expect(receipt.storeName).toBeNull();
    expect(receipt.taxAmount).toBeNull();
    expect(receipt.ocrConfidence).toBeNull();
  });

  it('throws on a missing required field', () => {
    expect(() => parseReceiptRow({ id: 'r-1' })).toThrow();
  });

  it('throws on an invalid ocr_status', () => {
    expect(() => parseReceiptRow({ ...receiptRow, ocr_status: 'weird' })).toThrow();
  });
});

const lineRow = {
  id: 'l-1',
  receipt_id: 'r-1',
  household_id: 'h-1',
  raw_text: 'MILK 2.00',
  canonical_name: 'milk',
  category: 'dairy',
  quantity: 1,
  unit: 'each',
  unit_price: 2,
  line_total: 2,
  pantry_item_id: null,
};

describe('parseLineItemRow', () => {
  it('maps a full line row', () => {
    const line = rowToLineItem(parseLineItemRow(lineRow));
    expect(line).toMatchObject({
      id: 'l-1',
      receiptId: 'r-1',
      rawText: 'MILK 2.00',
      canonicalName: 'milk',
      category: 'dairy',
      quantity: 1,
      unit: 'each',
      unitPrice: 2,
      lineTotal: 2,
      pantryItemId: null,
    });
  });

  it('accepts nullable fields', () => {
    const line = rowToLineItem(
      parseLineItemRow({
        ...lineRow,
        canonical_name: null,
        category: null,
        quantity: null,
        unit: null,
        unit_price: null,
      }),
    );
    expect(line.canonicalName).toBeNull();
    expect(line.quantity).toBeNull();
    expect(line.unitPrice).toBeNull();
  });

  it('throws when line_total is missing', () => {
    const { line_total: _omit, ...rest } = lineRow;
    expect(() => parseLineItemRow(rest)).toThrow();
  });
});
