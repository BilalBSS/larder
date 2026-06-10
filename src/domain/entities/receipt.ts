// / receipt value object
export type ReceiptOcrStatus = 'pending' | 'succeeded' | 'failed' | 'partial';

export interface Receipt {
  id: string;
  householdId: string;
  scannedByUserId: string;
  storeName: string | null;
  totalAmount: number;
  taxAmount: number | null;
  purchasedAt: string;
  ocrStatus: ReceiptOcrStatus;
  ocrConfidence: number | null;
  reconciledAt: string | null;
  createdAt: string;
}
