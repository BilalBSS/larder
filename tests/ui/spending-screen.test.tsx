import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import SpendingScreen from '@/app/(tabs)/spending';
import { useSpending } from '@/components/spending/useSpending';
import type { Receipt } from '@domain/entities/receipt';
import type { SpendingViewModel } from '@domain/use-cases/spending/view-model';
import { useUser } from '@foundation/context';

jest.mock('@foundation/context', () => ({ useUser: jest.fn() }));
jest.mock('@/components/spending/useSpending', () => ({ useSpending: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const mockUseUser = useUser as jest.Mock;
const mockUseSpending = useSpending as jest.Mock;

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

function vm(overrides: Partial<SpendingViewModel> = {}): SpendingViewModel {
  return {
    topEyebrow: 'Jun · 2 receipts · 2 cooks',
    hero: {
      eyebrow: 'Jun household total',
      total: 60,
      deltaPct: -12,
      deltaLabel: '12% vs May',
      budget: { limit: 100, spent: 60, remaining: 40, over: 0 },
      pendingNote: false,
    },
    members: {
      visible: true,
      rows: [
        {
          userId: 'u-1',
          label: 'You',
          isYou: true,
          total: 40,
          receiptCount: 1,
          sharePct: 67,
        },
        {
          userId: 'u-2',
          label: 'Partner',
          isYou: false,
          total: 20,
          receiptCount: 1,
          sharePct: 33,
        },
      ],
      footer: "You're owed £10 to even out Jun.",
      pillAmount: 10,
      settles: [],
    },
    trend: {
      visible: true,
      buckets: [
        { key: '2026-05', label: 'May', total: 68, current: false },
        { key: '2026-06', label: 'Jun', total: 60, current: true },
      ],
    },
    categories: {
      visible: true,
      breakdown: {
        slices: [
          { name: 'Produce', total: 30, pct: 60 },
          { name: 'Other', total: 20, pct: 40 },
        ],
        itemizedTotal: 50,
      },
    },
    stores: {
      visible: true,
      rows: [{ name: 'Aldi', total: 60, receiptCount: 2, average: 30 }],
    },
    recent: [receipt(), receipt({ id: 'r-2', ocrStatus: 'failed', storeName: null })],
    noReceipts: false,
    ...overrides,
  };
}

function hookReturn(overrides: Record<string, unknown> = {}) {
  return {
    vm: vm(),
    scope: 'household',
    setScope: jest.fn(),
    loading: false,
    error: null,
    reload: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
});

describe('SpendingScreen', () => {
  it('shows the no-household state', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: null, tier: 'free' });
    mockUseSpending.mockReturnValue(hookReturn({ vm: null }));
    render(<SpendingScreen />);
    expect(screen.getByText('No household yet.')).toBeOnTheScreen();
  });

  it('renders every section of the loaded dashboard', () => {
    mockUseSpending.mockReturnValue(hookReturn());
    render(<SpendingScreen />);
    expect(screen.getByText('Jun · 2 receipts · 2 cooks')).toBeOnTheScreen();
    expect(screen.getByText('Jun household total')).toBeOnTheScreen();
    expect(screen.getByText('12% vs May')).toBeOnTheScreen();
    expect(screen.getByText('Who spent what')).toBeOnTheScreen();
    expect(screen.getByText('Settle up · £10')).toBeOnTheScreen();
    expect(screen.getByText("You're owed £10 to even out Jun.")).toBeOnTheScreen();
    expect(screen.getByText('Last 6 months')).toBeOnTheScreen();
    expect(screen.getByText('By category')).toBeOnTheScreen();
    expect(screen.getByText('Items')).toBeOnTheScreen();
    expect(screen.getByText('By store')).toBeOnTheScreen();
    expect(screen.getByText('Recent receipts')).toBeOnTheScreen();
  });

  it('labels failed receipts instead of faking zero', () => {
    mockUseSpending.mockReturnValue(hookReturn());
    render(<SpendingScreen />);
    expect(screen.getByText("Couldn't read")).toBeOnTheScreen();
    expect(screen.getByText('Unknown store')).toBeOnTheScreen();
  });

  it('switches scope through the toggle', () => {
    const setScope = jest.fn();
    mockUseSpending.mockReturnValue(hookReturn({ setScope }));
    render(<SpendingScreen />);
    fireEvent.press(screen.getByText('Mine'));
    expect(setScope).toHaveBeenCalledWith('mine');
  });

  it('hides hidden sections', () => {
    mockUseSpending.mockReturnValue(
      hookReturn({
        vm: vm({
          members: {
            visible: false,
            rows: [],
            footer: '',
            pillAmount: null,
            settles: [],
          },
          trend: { visible: false, buckets: [] },
          categories: {
            visible: false,
            breakdown: { slices: [], itemizedTotal: 0 },
          },
          stores: { visible: false, rows: [] },
        }),
      }),
    );
    render(<SpendingScreen />);
    expect(screen.queryByText('Who spent what')).toBeNull();
    expect(screen.queryByText('Last 6 months')).toBeNull();
    expect(screen.queryByText('By category')).toBeNull();
    expect(screen.queryByText('By store')).toBeNull();
  });

  it('routes the empty state to scan and budget', () => {
    mockUseSpending.mockReturnValue(hookReturn({ vm: vm({ noReceipts: true }) }));
    render(<SpendingScreen />);
    expect(screen.getByText('No spending yet.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Scan a receipt'));
    expect(router.push).toHaveBeenCalledWith('/scan');
    fireEvent.press(screen.getByText('Set a budget'));
    expect(router.push).toHaveBeenCalledWith('/budget');
  });

  it('shows the error banner with retry', () => {
    const reload = jest.fn();
    mockUseSpending.mockReturnValue(hookReturn({ vm: null, error: new Error('x'), reload }));
    render(<SpendingScreen />);
    expect(
      screen.getByText('Could not load your spending. Check your connection.'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Retry'));
    expect(reload).toHaveBeenCalled();
  });

  it('opens budget, settle-up, receipts, and receipt detail', () => {
    mockUseSpending.mockReturnValue(hookReturn());
    render(<SpendingScreen />);
    fireEvent.press(screen.getByLabelText('Edit budget'));
    expect(router.push).toHaveBeenCalledWith('/budget');
    fireEvent.press(screen.getByText('Settle up · £10'));
    expect(router.push).toHaveBeenCalledWith('/settle-up');
    fireEvent.press(screen.getAllByLabelText('See all receipts')[0]);
    expect(router.push).toHaveBeenCalledWith('/receipts');
    fireEvent.press(screen.getByLabelText('Aldi, 2 Jun'));
    expect(router.push).toHaveBeenCalledWith('/receipt/r-1');
  });
});
