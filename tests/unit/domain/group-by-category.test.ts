import { describe, expect, it } from 'vitest';

import { groupByCategory } from '@domain/entities/group-by-category';
import type { ShoppingListItem } from '@domain/entities/shopping-list-item';

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

describe('groupByCategory', () => {
  it('orders canonical categories first', () => {
    const sections = groupByCategory([
      item({ id: 'a', category: 'Pantry' }),
      item({ id: 'b', category: 'Produce' }),
      item({ id: 'c', category: 'Dairy' }),
    ]);
    expect(sections.map((s) => s.title)).toEqual(['Produce', 'Dairy', 'Pantry']);
  });

  it('keeps checked items in their category', () => {
    const sections = groupByCategory([
      item({ id: 'a', category: 'Dairy', isCheckedOff: false }),
      item({ id: 'b', category: 'Dairy', isCheckedOff: true }),
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(sections[0]?.remaining).toBe(1);
  });

  it('buckets null and blank categories under other', () => {
    const sections = groupByCategory([
      item({ id: 'a', category: null }),
      item({ id: 'b', category: '   ' }),
      item({ id: 'c', category: 'Produce' }),
    ]);
    const other = sections.find((s) => s.title === 'Other');
    expect(other?.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(sections[sections.length - 1]?.title).toBe('Other');
  });

  it('sorts unknown categories after canonical ones, alphabetically', () => {
    const sections = groupByCategory([
      item({ id: 'a', category: 'Frozen' }),
      item({ id: 'b', category: 'Drinks' }),
      item({ id: 'c', category: 'Produce' }),
    ]);
    expect(sections.map((s) => s.title)).toEqual(['Produce', 'Drinks', 'Frozen']);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});
