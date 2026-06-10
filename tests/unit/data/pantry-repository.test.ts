import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { PantryItemRow } from '@data/dtos/pantry-item-dto';
import { makePantryRepository } from '@data/repositories/pantry-repository';

interface Result {
  readonly data?: unknown;
  readonly count?: number | null;
  readonly error: unknown;
}

interface Calls {
  select: unknown[][];
  insert: unknown[];
  update: unknown[];
  eq: unknown[][];
  is: unknown[][];
  order: unknown[][];
}

function stubSupabase(result: Result) {
  const calls: Calls = { select: [], insert: [], update: [], eq: [], is: [], order: [] };
  const builder = {
    select: (...args: unknown[]) => {
      calls.select.push(args);
      return builder;
    },
    insert: (payload: unknown) => {
      calls.insert.push(payload);
      return builder;
    },
    update: (payload: unknown) => {
      calls.update.push(payload);
      return builder;
    },
    eq: (...args: unknown[]) => {
      calls.eq.push(args);
      return builder;
    },
    is: (...args: unknown[]) => {
      calls.is.push(args);
      return builder;
    },
    order: (...args: unknown[]) => {
      calls.order.push(args);
      return builder;
    },
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (r: Result) => void) => resolve(result),
  };
  const supabase = { from: () => builder } as unknown as Pick<SupabaseClient, 'from'>;
  return { supabase, calls };
}

function row(overrides: Partial<PantryItemRow> = {}): PantryItemRow {
  return {
    id: 'i-1',
    household_id: 'h-1',
    canonical_name: 'bananas',
    display_name: 'Bananas',
    category: 'produce',
    quantity: 6,
    unit: 'count',
    expiration_date: null,
    estimated_expiration_days: 7,
    last_purchased_at: '2026-05-28T00:00:00.000Z',
    last_unit_cost: 1.5,
    notes: null,
    is_frozen: false,
    version: 1,
    created_at: '2026-05-28T00:00:00.000Z',
    updated_at: '2026-05-28T00:00:00.000Z',
    created_by_user_id: 'u-1',
    updated_by_user_id: 'u-1',
    deleted_at: null,
    ...overrides,
  };
}

describe('pantryRepository.list', () => {
  it('maps rows and orders by expiration then name', async () => {
    const { supabase, calls } = stubSupabase({ data: [row({ id: 'a' })], error: null });
    const repo = makePantryRepository({ supabase });
    const items = await repo.list('h-1');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'a', canonicalName: 'bananas' });
    expect(calls.is).toContainEqual(['deleted_at', null]);
    expect(calls.order).toContainEqual(['expiration_date', { ascending: true, nullsFirst: false }]);
    expect(calls.order).toContainEqual(['canonical_name', { ascending: true }]);
  });

  it('returns empty when data is null', async () => {
    const { supabase } = stubSupabase({ data: null, error: null });
    const repo = makePantryRepository({ supabase });
    expect(await repo.list('h-1')).toEqual([]);
  });

  it('throws when the query errors', async () => {
    const { supabase } = stubSupabase({ data: null, error: { message: 'boom' } });
    const repo = makePantryRepository({ supabase });
    await expect(repo.list('h-1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('pantryRepository.count', () => {
  it('requests an exact head count filtered on live rows', async () => {
    const { supabase, calls } = stubSupabase({ count: 12, error: null });
    const repo = makePantryRepository({ supabase });
    expect(await repo.count('h-1')).toBe(12);
    expect(calls.select[0]).toEqual(['id', { count: 'exact', head: true }]);
    expect(calls.is).toContainEqual(['deleted_at', null]);
  });

  it('throws rather than coalescing a null count', async () => {
    const { supabase } = stubSupabase({ count: null, error: null });
    const repo = makePantryRepository({ supabase });
    await expect(repo.count('h-1')).rejects.toThrow('pantry_count_unavailable');
  });

  it('throws when the count query errors', async () => {
    const { supabase } = stubSupabase({ count: null, error: { message: 'down' } });
    const repo = makePantryRepository({ supabase });
    await expect(repo.count('h-1')).rejects.toEqual({ message: 'down' });
  });
});

describe('pantryRepository.add', () => {
  it('inserts a normalized row stamping both audit columns', async () => {
    const { supabase, calls } = stubSupabase({ data: null, error: null });
    const repo = makePantryRepository({ supabase });
    await repo.add({
      householdId: 'h-1',
      userId: 'u-9',
      displayName: '  Whole   Milk  ',
      category: 'dairy',
      quantity: 2,
      unit: 'gallon',
      estimatedExpirationDays: 7,
      lastPurchasedAt: '2026-05-28T00:00:00.000Z',
      lastUnitCost: 3.5,
    });
    expect(calls.insert[0]).toMatchObject({
      household_id: 'h-1',
      canonical_name: 'whole milk',
      display_name: '  Whole   Milk  ',
      category: 'dairy',
      quantity: 2,
      unit: 'gallon',
      expiration_date: null,
      estimated_expiration_days: 7,
      last_purchased_at: '2026-05-28T00:00:00.000Z',
      last_unit_cost: 3.5,
      notes: null,
      is_frozen: false,
      created_by_user_id: 'u-9',
      updated_by_user_id: 'u-9',
    });
  });

  it('throws when the insert errors', async () => {
    const { supabase } = stubSupabase({ data: null, error: { message: 'nope' } });
    const repo = makePantryRepository({ supabase });
    await expect(
      repo.add({
        householdId: 'h-1',
        userId: 'u-1',
        displayName: 'Eggs',
        category: 'dairy',
        quantity: 12,
        unit: 'count',
      }),
    ).rejects.toEqual({ message: 'nope' });
  });
});

describe('pantryRepository.remove', () => {
  it('soft deletes scoped to the household and stamps the editor', async () => {
    const { supabase, calls } = stubSupabase({ data: null, error: null });
    const repo = makePantryRepository({ supabase });
    await repo.remove({ id: 'i-1', householdId: 'h-1', userId: 'u-3' });
    const patch = calls.update[0] as Record<string, unknown>;
    expect(typeof patch['deleted_at']).toBe('string');
    expect(patch['updated_by_user_id']).toBe('u-3');
    expect(calls.eq).toContainEqual(['id', 'i-1']);
    expect(calls.eq).toContainEqual(['household_id', 'h-1']);
  });

  it('throws when the update errors', async () => {
    const { supabase } = stubSupabase({ data: null, error: { message: 'fail' } });
    const repo = makePantryRepository({ supabase });
    await expect(repo.remove({ id: 'i-1', householdId: 'h-1', userId: 'u-1' })).rejects.toEqual({
      message: 'fail',
    });
  });
});

describe('pantryRepository.get', () => {
  it('maps a single live row scoped to the household', async () => {
    const { supabase, calls } = stubSupabase({ data: row({ id: 'g-1' }), error: null });
    const repo = makePantryRepository({ supabase });
    const found = await repo.get('g-1', 'h-1');
    expect(found).toMatchObject({ id: 'g-1', canonicalName: 'bananas' });
    expect(calls.eq).toContainEqual(['id', 'g-1']);
    expect(calls.eq).toContainEqual(['household_id', 'h-1']);
    expect(calls.is).toContainEqual(['deleted_at', null]);
  });

  it('returns null when no row is found', async () => {
    const { supabase } = stubSupabase({ data: null, error: null });
    const repo = makePantryRepository({ supabase });
    expect(await repo.get('missing', 'h-1')).toBeNull();
  });

  it('throws when the query errors', async () => {
    const { supabase } = stubSupabase({ data: null, error: { message: 'boom' } });
    const repo = makePantryRepository({ supabase });
    await expect(repo.get('g-1', 'h-1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('pantryRepository.update', () => {
  it('patches quantity and freeze scoped to live rows', async () => {
    const { supabase, calls } = stubSupabase({ data: null, error: null });
    const repo = makePantryRepository({ supabase });
    await repo.update({
      id: 'i-1',
      householdId: 'h-1',
      userId: 'u-9',
      quantity: 3,
      isFrozen: true,
    });
    expect(calls.update[0]).toEqual({
      updated_by_user_id: 'u-9',
      quantity: 3,
      is_frozen: true,
    });
    expect(calls.eq).toContainEqual(['id', 'i-1']);
    expect(calls.eq).toContainEqual(['household_id', 'h-1']);
    expect(calls.is).toContainEqual(['deleted_at', null]);
  });

  it('omits fields that were not provided', async () => {
    const { supabase, calls } = stubSupabase({ data: null, error: null });
    const repo = makePantryRepository({ supabase });
    await repo.update({ id: 'i-1', householdId: 'h-1', userId: 'u-9', isFrozen: true });
    expect(calls.update[0]).toEqual({ updated_by_user_id: 'u-9', is_frozen: true });
  });

  it('throws when the update errors', async () => {
    const { supabase } = stubSupabase({ data: null, error: { message: 'no' } });
    const repo = makePantryRepository({ supabase });
    await expect(
      repo.update({ id: 'i-1', householdId: 'h-1', userId: 'u-1', quantity: 1 }),
    ).rejects.toEqual({ message: 'no' });
  });
});
