// / receipt line value object
export interface ReceiptLineItem {
  id: string;
  receiptId: string;
  householdId: string;
  rawText: string;
  canonicalName: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  lineTotal: number;
  pantryItemId: string | null;
}
