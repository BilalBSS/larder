import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { ShoppingListItemRow } from '@data/dtos/shopping-list-item-dto';
import { makeShoppingListRepository } from '@data/repositories/shopping-list-repository';

interface Result {
  readonly data: unknown;
  readonly error: unknown;
}

function stubSupabase(result: Result) {
  const calls = { insert: [] as unknown[], update: [] as unknown[] };
  const builder = {
    select: () => builder,
    insert: (p: unknown) => {
      calls.insert.push(p);
      return builder;
    },
    update: (p: unknown) => {
      calls.update.push(p);
      return builder;
    },
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    then: (resolve: (r: Result) => void) => resolve(result),
  };
  const supabase = { from: () => builder } as unknown as Pick<SupabaseClient, 'from'>;
  return { supabase, calls };
}

function row(overrides: Partial<ShoppingListItemRow> = {}): ShoppingListItemRow {
  return {
    id: 'i-1',
    household_id: 'h-1',
    canonical_name: 'milk',
    display_name: 'Milk',
    quantity: null,
    unit: null,
    category: null,
    added_by_user_id: 'u-1',
    owner_user_id: null,
    is_auto_added: false,
    is_checked_off: false,
    checked_off_at: null,
    checked_off_by_user_id: null,
    version: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('shoppingListRepository.list', () => {
  it('maps rows to entities', async () => {
    const { supabase } = stubSupabase({
      data: [row({ id: 'a', display_name: 'Eggs', owner_user_id: 'u-2' })],
      error: null,
    });
    const repo = makeShoppingListRepository({ supabase });
    const items = await repo.list('h-1');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'a',
      householdId: 'h-1',
      displayName: 'Eggs',
      ownerUserId: 'u-2',
    });
  });

  it('returns empty when data is null', async () => {
    const { supabase } = stubSupabase({ data: null, error: null });
    const repo = makeShoppingListRepository({ supabase });
    expect(await repo.list('h-1')).toEqual([]);
  });

  it('throws when the query errors', async () => {
    const { supabase } = stubSupabase({ data: null, error: { message: 'boom' } });
    const repo = makeShoppingListRepository({ supabase });
    await expect(repo.list('h-1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('shoppingListRepository.add', () => {
  it('inserts a row with normalized canonical name', async () => {
    const { supabase, calls } = stubSupabase({ data: null, error: null });
    const repo = makeShoppingListRepository({ supabase });
    await repo.add({
      householdId: 'h-1',
      displayName: '  Whole   Milk  ',
      addedByUserId: 'u-1',
    });
    expect(calls.insert[0]).toMatchObject({
      household_id: 'h-1',
      canonical_name: 'whole milk',
      display_name: '  Whole   Milk  ',
      quantity: null,
      unit: null,
      category: null,
      added_by_user_id: 'u-1',
      owner_user_id: null,
      is_auto_added: false,
    });
  });

  it('throws when insert errors', async () => {
    const { supabase } = stubSupabase({ data: null, error: { message: 'nope' } });
    const repo = makeShoppingListRepository({ supabase });
    await expect(
      repo.add({ householdId: 'h-1', displayName: 'Milk', addedByUserId: 'u-1' }),
    ).rejects.toEqual({ message: 'nope' });
  });
});

describe('shoppingListRepository.setChecked', () => {
  it('checks off with timestamp and user', async () => {
    const { supabase, calls } = stubSupabase({ data: null, error: null });
    const repo = makeShoppingListRepository({ supabase });
    await repo.setChecked({ id: 'i-1', householdId: 'h-1', userId: 'u-1', checked: true });
    const patch = calls.update[0] as Record<string, unknown>;
    expect(patch['is_checked_off']).toBe(true);
    expect(patch['checked_off_by_user_id']).toBe('u-1');
    expect(typeof patch['checked_off_at']).toBe('string');
  });

  it('unchecks by clearing fields', async () => {
    const { supabase, calls } = stubSupabase({ data: null, error: null });
    const repo = makeShoppingListRepository({ supabase });
    await repo.setChecked({ id: 'i-1', householdId: 'h-1', userId: 'u-1', checked: false });
    expect(calls.update[0]).toEqual({
      is_checked_off: false,
      checked_off_at: null,
      checked_off_by_user_id: null,
    });
  });

  it('throws when update errors', async () => {
    const { supabase } = stubSupabase({ data: null, error: { message: 'bad' } });
    const repo = makeShoppingListRepository({ supabase });
    await expect(
      repo.setChecked({ id: 'i-1', householdId: 'h-1', userId: 'u-1', checked: true }),
    ).rejects.toEqual({ message: 'bad' });
  });
});

describe('shoppingListRepository.remove', () => {
  it('sets deleted_at', async () => {
    const { supabase, calls } = stubSupabase({ data: null, error: null });
    const repo = makeShoppingListRepository({ supabase });
    await repo.remove({ id: 'i-1', householdId: 'h-1' });
    const patch = calls.update[0] as Record<string, unknown>;
    expect(typeof patch['deleted_at']).toBe('string');
  });

  it('throws when update errors', async () => {
    const { supabase } = stubSupabase({ data: null, error: { message: 'fail' } });
    const repo = makeShoppingListRepository({ supabase });
    await expect(repo.remove({ id: 'i-1', householdId: 'h-1' })).rejects.toEqual({
      message: 'fail',
    });
  });
});
