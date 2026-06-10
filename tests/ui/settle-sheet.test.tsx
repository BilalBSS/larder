import { render, screen, waitFor } from '@testing-library/react-native';

import SettleUpScreen from '@/app/settle-up';
import type { DashboardData } from '@domain/use-cases/spending/get-dashboard';
import type { Receipt } from '@domain/entities/receipt';
import { spendingService } from '@domain/use-cases/spending/service';
import { useUser } from '@foundation/context';

jest.mock('@foundation/context', () => ({ useUser: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('@domain/use-cases/spending/service', () => ({
  spendingService: { dashboard: jest.fn() },
}));

const mockUseUser = useUser as jest.Mock;
const mockService = spendingService as jest.Mocked<typeof spendingService>;

const NOW = new Date('2026-06-10T08:00:00.000Z');

function receipt(overrides: Partial<Receipt>): Receipt {
  return {
    id: 'r-1',
    householdId: 'h-1',
    scannedByUserId: 'u-1',
    storeName: 'Aldi',
    totalAmount: 60,
    taxAmount: null,
    purchasedAt: '2026-06-02T00:00:00.000Z',
    ocrStatus: 'succeeded',
    ocrConfidence: null,
    reconciledAt: null,
    createdAt: '2026-06-02T10:00:00.000Z',
    ...overrides,
  };
}

function dashboard(window: Receipt[]): DashboardData {
  return {
    window,
    currentMonthLines: [],
    recent: window,
    budgets: { household: null, personal: null },
    members: [
      { userId: 'u-1', role: 'owner' },
      { userId: 'u-2', role: 'member' },
    ],
    householdType: 'couple',
    now: NOW,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
});

describe('SettleUpScreen', () => {
  it('lists current and prior month transfers', async () => {
    mockService.dashboard.mockResolvedValue(
      dashboard([
        receipt({ totalAmount: 60 }),
        receipt({
          id: 'r-2',
          scannedByUserId: 'u-2',
          purchasedAt: '2026-05-20T00:00:00.000Z',
          totalAmount: 30,
        }),
      ]),
    );
    render(<SettleUpScreen />);
    await waitFor(() => expect(screen.getByText('Jun')).toBeOnTheScreen());
    expect(screen.getByText('May')).toBeOnTheScreen();
    expect(screen.getAllByText('Split evenly across 2 members')).toHaveLength(2);
    expect(screen.getAllByText('Partner').length).toBeGreaterThan(0);
    expect(screen.getAllByText('You').length).toBeGreaterThan(0);
  });

  it('shows the even state when nothing is owed', async () => {
    mockService.dashboard.mockResolvedValue(
      dashboard([
        receipt({ totalAmount: 40 }),
        receipt({ id: 'r-2', scannedByUserId: 'u-2', totalAmount: 40 }),
      ]),
    );
    render(<SettleUpScreen />);
    expect(await screen.findByText("Everyone's even this month.")).toBeOnTheScreen();
  });

  it('surfaces load failures', async () => {
    mockService.dashboard.mockRejectedValue(new Error('down'));
    render(<SettleUpScreen />);
    expect(await screen.findByText("Couldn't load the split. Try again.")).toBeOnTheScreen();
  });
});
