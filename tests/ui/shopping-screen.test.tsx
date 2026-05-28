import { fireEvent, render, screen } from '@testing-library/react-native';

import ShoppingScreen from '@/app/(tabs)/shopping';
import { useShoppingList } from '@/components/shopping/useShoppingList';
import type { ShoppingListItem } from '@domain/entities/shopping-list-item';
import { useUser } from '@foundation/context';

jest.mock('@foundation/context', () => ({ useUser: jest.fn() }));
jest.mock('@/components/shopping/useShoppingList', () => ({ useShoppingList: jest.fn() }));

const mockUseUser = useUser as jest.Mock;
const mockUseShoppingList = useShoppingList as jest.Mock;

function item(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id: 'i-1',
    householdId: 'h-1',
    canonicalName: 'milk',
    displayName: 'Milk',
    quantity: null,
    unit: null,
    category: null,
    addedByUserId: 'u-1',
    ownerUserId: null,
    isAutoAdded: false,
    isCheckedOff: false,
    checkedOffAt: null,
    checkedOffByUserId: null,
    version: 1,
    createdAt: '2026-05-28T00:00:00Z',
    ...overrides,
  };
}

function hookReturn(overrides: Record<string, unknown> = {}) {
  return {
    toBuy: [],
    gotIt: [],
    loading: false,
    error: null,
    add: jest.fn(),
    toggle: jest.fn(),
    remove: jest.fn(),
    reload: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ShoppingScreen', () => {
  it('shows the no-household state', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: null, tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn());
    render(<ShoppingScreen />);
    expect(screen.getByText('No household yet')).toBeOnTheScreen();
  });

  it('shows the empty list state', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn());
    render(<ShoppingScreen />);
    expect(screen.getByText(/Your list is empty/)).toBeOnTheScreen();
  });

  it('renders both sections', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(
      hookReturn({
        toBuy: [item({ id: 'a', displayName: 'Milk' })],
        gotIt: [item({ id: 'b', displayName: 'Bread', isCheckedOff: true })],
      }),
    );
    render(<ShoppingScreen />);
    expect(screen.getByText('To buy')).toBeOnTheScreen();
    expect(screen.getByText('Milk')).toBeOnTheScreen();
    expect(screen.getByText('Got it')).toBeOnTheScreen();
    expect(screen.getByText('Bread')).toBeOnTheScreen();
  });

  it('forwards a new item to the add handler', () => {
    const add = jest.fn();
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn({ add }));
    render(<ShoppingScreen />);
    fireEvent.changeText(screen.getByLabelText('new item name'), 'cheese');
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(add).toHaveBeenCalledWith('cheese');
  });

  it('toggles an item from its row', () => {
    const toggle = jest.fn();
    const milk = item({ id: 'a', displayName: 'Milk' });
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn({ toBuy: [milk], toggle }));
    render(<ShoppingScreen />);
    fireEvent.press(screen.getByLabelText('toggle Milk'));
    expect(toggle).toHaveBeenCalledWith(milk);
  });

  it('shows the error banner with retry', () => {
    const reload = jest.fn();
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn({ error: new Error('boom'), reload }));
    render(<ShoppingScreen />);
    expect(screen.getByText('Could not load your list.')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(reload).toHaveBeenCalled();
  });
});
