import { fireEvent, render, screen } from '@testing-library/react-native';

import PantryScreen from '@/app/(tabs)/index';
import { usePantry } from '@/components/pantry/usePantry';
import type { PantryItem } from '@domain/entities/pantry-item';
import { useUser } from '@foundation/context';

jest.mock('@foundation/context', () => ({ useUser: jest.fn() }));
jest.mock('@/components/pantry/usePantry', () => ({ usePantry: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const mockUseUser = useUser as jest.Mock;
const mockUsePantry = usePantry as jest.Mock;

const NOW = new Date(2026, 5, 1, 12, 0);

function localDateStr(offsetDays: number): string {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const base: PantryItem = {
  id: 'i-1',
  householdId: 'h-1',
  canonicalName: 'bananas',
  displayName: 'Bananas',
  category: 'produce',
  quantity: 6,
  unit: 'count',
  expirationDate: null,
  estimatedExpirationDays: null,
  lastPurchasedAt: null,
  lastUnitCost: null,
  notes: null,
  isFrozen: false,
  createdByUserId: 'u-1',
  updatedByUserId: 'u-1',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

function item(overrides: Partial<PantryItem> = {}): PantryItem {
  return { ...base, ...overrides };
}

function hookReturn(overrides: Record<string, unknown> = {}) {
  return {
    items: [] as PantryItem[],
    loading: false,
    error: null,
    loadedAt: NOW,
    remove: jest.fn(),
    reload: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PantryScreen', () => {
  it('shows the no-household state', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: null, tier: 'free' });
    mockUsePantry.mockReturnValue(hookReturn());
    render(<PantryScreen />);
    expect(screen.getByText('No household yet.')).toBeOnTheScreen();
  });

  it('shows a skeleton during the initial load', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUsePantry.mockReturnValue(hookReturn({ loading: true }));
    render(<PantryScreen />);
    expect(screen.getByTestId('pantry-skeleton')).toBeOnTheScreen();
  });

  it('shows the first-run empty state without a scan affordance', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUsePantry.mockReturnValue(hookReturn());
    render(<PantryScreen />);
    expect(screen.getByText("Let's stock the pantry.")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add by hand' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Scan a receipt' })).toBeNull();
  });

  it('groups populated items into urgency sections', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUsePantry.mockReturnValue(
      hookReturn({
        items: [
          item({ id: 'a', displayName: 'Milk', expirationDate: localDateStr(1) }),
          item({ id: 'b', displayName: 'Rice', expirationDate: localDateStr(9) }),
        ],
      }),
    );
    render(<PantryScreen />);
    expect(screen.getByText('Milk')).toBeOnTheScreen();
    expect(screen.getByText('Rice')).toBeOnTheScreen();
  });

  it('filters to a section when a chip is pressed', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUsePantry.mockReturnValue(
      hookReturn({
        items: [
          item({ id: 'a', displayName: 'Milk', expirationDate: localDateStr(1) }),
          item({ id: 'b', displayName: 'Rice', expirationDate: localDateStr(9) }),
        ],
      }),
    );
    render(<PantryScreen />);
    fireEvent.press(screen.getByLabelText('Fresh, 1 items'));
    expect(screen.queryByText('Milk')).toBeNull();
    expect(screen.getByText('Rice')).toBeOnTheScreen();
  });

  it('shows the filtered-empty state from a glance tap', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUsePantry.mockReturnValue(
      hookReturn({
        items: [item({ id: 'b', displayName: 'Rice', expirationDate: localDateStr(9) })],
      }),
    );
    render(<PantryScreen />);
    fireEvent.press(screen.getByLabelText('Use first, 0 items'));
    expect(screen.getByText('Nothing here.')).toBeOnTheScreen();
  });

  it('shows an error banner with retry', () => {
    const reload = jest.fn();
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUsePantry.mockReturnValue(hookReturn({ error: new Error('boom'), reload }));
    render(<PantryScreen />);
    expect(screen.getByText(/Could not load your pantry/)).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(reload).toHaveBeenCalled();
  });
});
