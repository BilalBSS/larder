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
    createdAt: '2026-05-28T00:00:00Z',
    ...overrides,
  };
}

function hookReturn(overrides: Record<string, unknown> = {}) {
  return {
    items: [],
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
    expect(screen.getByText('No household yet.')).toBeOnTheScreen();
  });

  it('shows the empty list state', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn());
    render(<ShoppingScreen />);
    expect(screen.getByText('Your list is empty.')).toBeOnTheScreen();
  });

  it('shows a loading indicator during the initial load', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn({ loading: true }));
    render(<ShoppingScreen />);
    expect(screen.getByTestId('shopping-loading')).toBeOnTheScreen();
    expect(screen.queryByText('Your list is empty.')).toBeNull();
  });

  it('groups items into category sections', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(
      hookReturn({
        items: [
          item({ id: 'a', displayName: 'Milk', category: 'Dairy' }),
          item({ id: 'b', displayName: 'Lemons', category: 'Produce', isCheckedOff: true }),
        ],
      }),
    );
    render(<ShoppingScreen />);
    expect(screen.getByText('Produce')).toBeOnTheScreen();
    expect(screen.getByText('Dairy')).toBeOnTheScreen();
    expect(screen.getByText('Milk')).toBeOnTheScreen();
    expect(screen.getByText('Lemons')).toBeOnTheScreen();
  });

  it('reports the remaining count in the sub heading', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(
      hookReturn({
        items: [
          item({ id: 'a', category: 'Dairy' }),
          item({ id: 'b', category: 'Produce', isCheckedOff: true }),
        ],
      }),
    );
    render(<ShoppingScreen />);
    expect(screen.getByText('1 of 2 to grab')).toBeOnTheScreen();
  });

  it('forwards a new item to the add handler', () => {
    const add = jest.fn();
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn({ add }));
    render(<ShoppingScreen />);
    fireEvent.changeText(screen.getByLabelText('new item name'), 'cheese');
    fireEvent(screen.getByLabelText('new item name'), 'submitEditing');
    expect(add).toHaveBeenCalledWith('cheese');
  });

  it('toggles an item from its row', () => {
    const toggle = jest.fn();
    const milk = item({ id: 'a', displayName: 'Milk', category: 'Dairy' });
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn({ items: [milk], toggle }));
    render(<ShoppingScreen />);
    fireEvent.press(screen.getByLabelText('toggle Milk'));
    expect(toggle).toHaveBeenCalledWith(milk);
  });

  it('shows the error banner with retry', () => {
    const reload = jest.fn();
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    mockUseShoppingList.mockReturnValue(hookReturn({ error: new Error('boom'), reload }));
    render(<ShoppingScreen />);
    expect(screen.getByText(/Could not load your list/)).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(reload).toHaveBeenCalled();
  });
});
