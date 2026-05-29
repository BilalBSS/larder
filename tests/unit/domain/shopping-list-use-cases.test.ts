import { describe, expect, it, vi } from 'vitest';

import type { ShoppingListRepository } from '@data/repositories/shopping-list-repository';
import type { ShoppingListItem } from '@domain/entities/shopping-list-item';
import {
  addToShoppingList,
  checkOffItem,
  listShoppingList,
  removeShoppingListItem,
} from '@domain/use-cases/shopping-list';

function item(overrides: Partial<ShoppingListItem>): ShoppingListItem {
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
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<ShoppingListRepository> = {}): ShoppingListRepository {
  return {
    list: async () => [],
    add: async () => undefined,
    setChecked: async () => undefined,
    remove: async () => undefined,
    ...overrides,
  };
}

describe('listShoppingList', () => {
  it('groups by checked state and preserves order', async () => {
    const items = [
      item({ id: 'a', isCheckedOff: false }),
      item({ id: 'b', isCheckedOff: true }),
      item({ id: 'c', isCheckedOff: false }),
      item({ id: 'd', isCheckedOff: true }),
    ];
    const grouped = await listShoppingList(fakeRepo({ list: async () => items }), 'h-1');
    expect(grouped.toBuy.map((i) => i.id)).toEqual(['a', 'c']);
    expect(grouped.gotIt.map((i) => i.id)).toEqual(['b', 'd']);
  });
});

describe('addToShoppingList', () => {
  it('throws on empty name', async () => {
    await expect(
      addToShoppingList(fakeRepo(), {
        householdId: 'h-1',
        displayName: '',
        addedByUserId: 'u-1',
      }),
    ).rejects.toThrow('empty_item_name');
  });

  it('throws on whitespace name', async () => {
    await expect(
      addToShoppingList(fakeRepo(), {
        householdId: 'h-1',
        displayName: '   ',
        addedByUserId: 'u-1',
      }),
    ).rejects.toThrow('empty_item_name');
  });

  it('trims and forwards otherwise', async () => {
    const add = vi.fn(async () => undefined);
    await addToShoppingList(fakeRepo({ add }), {
      householdId: 'h-1',
      displayName: '  Eggs  ',
      addedByUserId: 'u-1',
    });
    expect(add).toHaveBeenCalledWith({
      householdId: 'h-1',
      displayName: 'Eggs',
      addedByUserId: 'u-1',
    });
  });
});

describe('checkOffItem', () => {
  it('forwards args to setChecked', async () => {
    const setChecked = vi.fn(async () => undefined);
    const input = { id: 'i-1', householdId: 'h-1', userId: 'u-1', checked: true };
    await checkOffItem(fakeRepo({ setChecked }), input);
    expect(setChecked).toHaveBeenCalledWith(input);
  });
});

describe('removeShoppingListItem', () => {
  it('forwards args to remove', async () => {
    const remove = vi.fn(async () => undefined);
    const input = { id: 'i-1', householdId: 'h-1' };
    await removeShoppingListItem(fakeRepo({ remove }), input);
    expect(remove).toHaveBeenCalledWith(input);
  });
});
