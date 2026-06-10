import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { PantryRow } from '@/components/pantry/PantryRow';
import type { PantryItem } from '@domain/entities/pantry-item';

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

describe('PantryRow', () => {
  it('renders name, quantity and price', () => {
    render(<PantryRow item={item({ quantity: 6, unit: 'count', lastUnitCost: 2.5 })} now={NOW} />);
    expect(screen.getByText('Bananas')).toBeOnTheScreen();
    expect(screen.getByText('6')).toBeOnTheScreen();
    expect(screen.getByText('count')).toBeOnTheScreen();
    expect(screen.getByText('.50')).toBeOnTheScreen();
  });

  it('captions urgency as text per tone', () => {
    const { rerender } = render(
      <PantryRow item={item({ expirationDate: localDateStr(1) })} now={NOW} />,
    );
    expect(screen.getByText('use first')).toBeOnTheScreen();
    rerender(<PantryRow item={item({ expirationDate: localDateStr(3) })} now={NOW} />);
    expect(screen.getByText('this week')).toBeOnTheScreen();
    rerender(<PantryRow item={item({ expirationDate: localDateStr(9) })} now={NOW} />);
    expect(screen.getByText('fresh')).toBeOnTheScreen();
    rerender(<PantryRow item={item({ expirationDate: localDateStr(-1) })} now={NOW} />);
    expect(screen.getByText('expired')).toBeOnTheScreen();
  });

  it('shows dashes for unknown expiry and missing cost', () => {
    render(<PantryRow item={item({ expirationDate: null, lastUnitCost: null })} now={NOW} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('composes an accessibility label with urgency as text', () => {
    render(
      <PantryRow
        item={item({
          quantity: 6,
          unit: 'count',
          expirationDate: localDateStr(3),
          lastUnitCost: 1.5,
        })}
        now={NOW}
      />,
    );
    expect(screen.getByLabelText('Bananas, 6 count, 3 days left, £1.50')).toBeOnTheScreen();
  });

  it('labels frozen items as frozen', () => {
    render(<PantryRow item={item({ isFrozen: true, lastUnitCost: null })} now={NOW} />);
    expect(screen.getByLabelText('Bananas, 6 count, frozen, no price')).toBeOnTheScreen();
  });

  it('captions a frozen item as frozen even with an expiry date', () => {
    render(
      <PantryRow item={item({ isFrozen: true, expirationDate: localDateStr(1) })} now={NOW} />,
    );
    expect(screen.getByText('frozen')).toBeOnTheScreen();
    expect(screen.queryByText('use first')).toBeNull();
  });

  it('navigates on press', () => {
    const onPress = jest.fn();
    render(<PantryRow item={item()} now={NOW} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText(/Bananas/));
    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'i-1' }));
  });

  it('confirms before removing on long press', () => {
    const onRemove = jest.fn();
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const target = item();
    render(<PantryRow item={target} now={NOW} onRemove={onRemove} />);
    fireEvent(screen.getByLabelText(/Bananas/), 'longPress');
    expect(spy).toHaveBeenCalled();
    const buttons = spy.mock.calls[0]?.[2];
    buttons?.[1]?.onPress?.();
    expect(onRemove).toHaveBeenCalledWith(target);
    spy.mockRestore();
  });
});
