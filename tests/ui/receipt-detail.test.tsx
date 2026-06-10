import { render, screen, waitFor } from '@testing-library/react-native';

import ReceiptDetailScreen from '@/app/receipt/[id]';
import type { Receipt } from '@domain/entities/receipt';
import type { ReceiptLineItem } from '@domain/entities/receipt-line-item';
import { receiptService } from '@domain/use-cases/receipt/service';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'r-1' })),
}));
jest.mock('@domain/use-cases/receipt/service', () => ({
  receiptService: { get: jest.fn() },
}));

const mockService = receiptService as jest.Mocked<typeof receiptService>;

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: 'r-1',
    householdId: 'h-1',
    scannedByUserId: 'u-1',
    storeName: 'Aldi',
    totalAmount: 24.5,
    taxAmount: 1.2,
    purchasedAt: '2026-06-02T00:00:00.000Z',
    ocrStatus: 'succeeded',
    ocrConfidence: null,
    reconciledAt: '2026-06-02T11:00:00.000Z',
    createdAt: '2026-06-02T10:00:00.000Z',
    ...overrides,
  };
}

function line(overrides: Partial<ReceiptLineItem> = {}): ReceiptLineItem {
  return {
    id: 'l-1',
    receiptId: 'r-1',
    householdId: 'h-1',
    rawText: 'MILK 2PT',
    canonicalName: 'milk',
    category: 'dairy',
    quantity: 2,
    unit: 'each',
    unitPrice: 1.5,
    lineTotal: 3,
    pantryItemId: 'p-1',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReceiptDetailScreen', () => {
  it('renders totals, lines, and the pantry count', async () => {
    mockService.get.mockResolvedValue({
      receipt: receipt(),
      lineItems: [line(), line({ id: 'l-2', canonicalName: null, pantryItemId: null })],
    });
    render(<ReceiptDetailScreen />);
    await waitFor(() => expect(screen.getByText('Aldi')).toBeOnTheScreen());
    expect(screen.getByText('2 Jun')).toBeOnTheScreen();
    expect(screen.getByText('Total')).toBeOnTheScreen();
    expect(screen.getByText('incl. £1.20 tax')).toBeOnTheScreen();
    expect(screen.getByText('milk')).toBeOnTheScreen();
    expect(screen.getByText('MILK 2PT')).toBeOnTheScreen();
    expect(screen.getAllByText('2 × £1.50')).toHaveLength(2);
    expect(screen.getByText('1 of 2 items added to your pantry.')).toBeOnTheScreen();
  });

  it('hides totals for a failed scan', async () => {
    mockService.get.mockResolvedValue({
      receipt: receipt({ ocrStatus: 'failed', storeName: null, totalAmount: 0 }),
      lineItems: [],
    });
    render(<ReceiptDetailScreen />);
    expect(await screen.findByText("Couldn't read this receipt.")).toBeOnTheScreen();
    expect(screen.queryByText('Total')).toBeNull();
  });

  it('marks pending scans', async () => {
    mockService.get.mockResolvedValue({
      receipt: receipt({ ocrStatus: 'pending', totalAmount: 0 }),
      lineItems: [],
    });
    render(<ReceiptDetailScreen />);
    expect(await screen.findByText('Still processing.')).toBeOnTheScreen();
  });

  it('handles a missing receipt', async () => {
    mockService.get.mockResolvedValue(null);
    render(<ReceiptDetailScreen />);
    expect(await screen.findByText("Couldn't find this receipt.")).toBeOnTheScreen();
  });
});
