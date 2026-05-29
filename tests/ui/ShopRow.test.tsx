import { fireEvent, render, screen } from '@testing-library/react-native';

import { ShopRow } from '@/components/shopping/ShopRow';
import type { ShoppingListItem } from '@domain/entities/shopping-list-item';

function makeItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
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

describe('ShopRow', () => {
  it('renders name and quantity', () => {
    render(
      <ShopRow
        item={makeItem({ quantity: 2, unit: 'L' })}
        currentUserId="u-1"
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByText('Milk')).toBeOnTheScreen();
    expect(screen.getByText('2 L')).toBeOnTheScreen();
  });

  it('fires onToggle from the checkbox', () => {
    const onToggle = jest.fn();
    const item = makeItem();
    render(<ShopRow item={item} currentUserId="u-1" onToggle={onToggle} />);
    fireEvent.press(screen.getByLabelText('toggle Milk'));
    expect(onToggle).toHaveBeenCalledWith(item);
  });

  it('strikes through a checked item in place', () => {
    render(
      <ShopRow item={makeItem({ isCheckedOff: true })} currentUserId="u-1" onToggle={jest.fn()} />,
    );
    const className = String(screen.getByText('Milk').props.className);
    expect(className).toContain('line-through');
    expect(className).toContain('text-muted');
  });

  it('marks an item owned by the current user', () => {
    render(
      <ShopRow item={makeItem({ ownerUserId: 'u-1' })} currentUserId="u-1" onToggle={jest.fn()} />,
    );
    expect(screen.getByText('mine')).toBeOnTheScreen();
  });

  it('omits the mine label for another owner', () => {
    render(
      <ShopRow item={makeItem({ ownerUserId: 'u-2' })} currentUserId="u-1" onToggle={jest.fn()} />,
    );
    expect(screen.queryByText('mine')).toBeNull();
  });

  it('shows the smart re-order tag when flagged', () => {
    render(<ShopRow item={makeItem()} currentUserId="u-1" onToggle={jest.fn()} smart />);
    expect(screen.getByText('smart re-order')).toBeOnTheScreen();
  });
});
