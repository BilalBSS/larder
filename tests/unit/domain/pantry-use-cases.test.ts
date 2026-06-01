import { describe, expect, it, vi } from 'vitest';

import type { CanonicalIngredientRepository } from '@data/repositories/canonical-ingredient-repository';
import type { PantryRepository } from '@data/repositories/pantry-repository';
import {
  addPantryItem,
  listPantry,
  lookupCanonical,
  PantryCapError,
  removePantryItem,
} from '@domain/use-cases/pantry';
import { ENTITLEMENTS } from '@foundation/billing/entitlements';

function fakeRepo(overrides: Partial<PantryRepository> = {}): PantryRepository {
  return {
    list: async () => [],
    count: async () => 0,
    add: async () => undefined,
    remove: async () => undefined,
    ...overrides,
  };
}

const baseInput = {
  householdId: 'h-1',
  userId: 'u-1',
  displayName: 'Bananas',
  category: 'produce',
  quantity: 6,
  unit: 'count',
};

describe('addPantryItem', () => {
  it('adds when under the free cap', async () => {
    const add = vi.fn(async () => undefined);
    await addPantryItem(fakeRepo({ count: async () => 10, add }), baseInput, ENTITLEMENTS.free);
    expect(add).toHaveBeenCalledWith({ ...baseInput, displayName: 'Bananas', unit: 'count' });
  });

  it('adds the 50th item at the cap boundary', async () => {
    const add = vi.fn(async () => undefined);
    await addPantryItem(fakeRepo({ count: async () => 49, add }), baseInput, ENTITLEMENTS.free);
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('throws PantryCapError at the cap', async () => {
    const add = vi.fn(async () => undefined);
    await expect(
      addPantryItem(fakeRepo({ count: async () => 50, add }), baseInput, ENTITLEMENTS.free),
    ).rejects.toBeInstanceOf(PantryCapError);
    expect(add).not.toHaveBeenCalled();
  });

  it('ignores the cap for unlimited tiers', async () => {
    const add = vi.fn(async () => undefined);
    await addPantryItem(
      fakeRepo({ count: async () => 9999, add }),
      baseInput,
      ENTITLEMENTS.solo_monthly,
    );
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('trims the name and unit before forwarding', async () => {
    const add = vi.fn(async () => undefined);
    await addPantryItem(
      fakeRepo({ count: async () => 0, add }),
      { ...baseInput, displayName: '  Eggs  ', unit: '  count  ' },
      ENTITLEMENTS.free,
    );
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Eggs', unit: 'count' }),
    );
  });

  it('rejects an empty name before counting', async () => {
    const count = vi.fn(async () => 0);
    await expect(
      addPantryItem(fakeRepo({ count }), { ...baseInput, displayName: '   ' }, ENTITLEMENTS.free),
    ).rejects.toThrow('empty_item_name');
    expect(count).not.toHaveBeenCalled();
  });

  it('rejects a negative quantity', async () => {
    await expect(
      addPantryItem(fakeRepo(), { ...baseInput, quantity: -1 }, ENTITLEMENTS.free),
    ).rejects.toThrow('invalid_quantity');
  });

  it('rejects an empty unit', async () => {
    await expect(
      addPantryItem(fakeRepo(), { ...baseInput, unit: '  ' }, ENTITLEMENTS.free),
    ).rejects.toThrow('empty_unit');
  });
});

describe('listPantry', () => {
  it('returns the repository rows', async () => {
    const items = [{ id: 'a' }] as Awaited<ReturnType<PantryRepository['list']>>;
    expect(await listPantry(fakeRepo({ list: async () => items }), 'h-1')).toBe(items);
  });
});

describe('removePantryItem', () => {
  it('forwards the remove input', async () => {
    const remove = vi.fn(async () => undefined);
    const input = { id: 'i-1', householdId: 'h-1', userId: 'u-1' };
    await removePantryItem(fakeRepo({ remove }), input);
    expect(remove).toHaveBeenCalledWith(input);
  });
});

describe('lookupCanonical', () => {
  it('delegates to the canonical repository', async () => {
    const match = { canonicalName: 'bananas', category: 'produce', defaultExpirationDays: 7 };
    const repo: CanonicalIngredientRepository = { lookup: vi.fn(async () => match) };
    expect(await lookupCanonical(repo, 'bananas')).toBe(match);
    expect(repo.lookup).toHaveBeenCalledWith('bananas');
  });
});
