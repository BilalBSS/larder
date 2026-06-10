import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ReceiptsScreen from '@/app/receipts';
import type { Receipt } from '@domain/entities/receipt';
import { receiptService } from '@domain/use-cases/receipt/service';
import { useUser } from '@foundation/context';

jest.mock('@foundation/context', () => ({ useUser: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@domain/use-cases/receipt/service', () => ({
  receiptService: { list: jest.fn() },
}));

const mockUseUser = useUser as jest.Mock;
const mockService = receiptService as jest.Mocked<typeof receiptService>;

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: 'r-1',
    householdId: 'h-1',
    scannedByUserId: 'u-1',
    storeName: 'Aldi',
    totalAmount: 24.5,
    taxAmount: null,
    purchasedAt: '2026-06-02T00:00:00.000Z',
    ocrStatus: 'succeeded',
    ocrConfidence: null,
    reconciledAt: null,
    createdAt: '2026-06-02T10:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
});

describe('ReceiptsScreen', () => {
  it('lists receipts with status labels and opens detail', async () => {
    mockService.list.mockResolvedValue([
      receipt(),
      receipt({ id: 'r-2', ocrStatus: 'pending', storeName: 'Tesco' }),
      receipt({ id: 'r-3', ocrStatus: 'failed', storeName: null }),
    ]);
    render(<ReceiptsScreen />);
    await waitFor(() => expect(screen.getByText('Aldi')).toBeOnTheScreen());
    expect(mockService.list).toHaveBeenCalledWith('h-1', 100);
    expect(screen.getByText('Still processing')).toBeOnTheScreen();
    expect(screen.getByText("Couldn't read")).toBeOnTheScreen();
    expect(screen.getByText('Unknown store')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Aldi'));
    expect(router.push).toHaveBeenCalledWith('/receipt/r-1');
  });

  it('shows the empty state', async () => {
    mockService.list.mockResolvedValue([]);
    render(<ReceiptsScreen />);
    expect(await screen.findByText('No receipts yet.')).toBeOnTheScreen();
  });

  it('navigates back', async () => {
    mockService.list.mockResolvedValue([]);
    render(<ReceiptsScreen />);
    await screen.findByText('No receipts yet.');
    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('surfaces load failures', async () => {
    mockService.list.mockRejectedValue(new Error('down'));
    render(<ReceiptsScreen />);
    expect(await screen.findByText("Couldn't load receipts. Try again.")).toBeOnTheScreen();
  });
});
