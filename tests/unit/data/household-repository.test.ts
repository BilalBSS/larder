import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { makeHouseholdRepository } from '@data/repositories/household-repository';

interface Result {
  readonly data: unknown;
  readonly error: unknown;
}

function stubSupabase(byTable: Record<string, Result>): Pick<SupabaseClient, 'from'> {
  const make = (result: Result) => {
    const builder = {
      select: () => builder,
      update: () => builder,
      eq: () => builder,
      is: () => builder,
      order: () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (r: Result) => void) => resolve(result),
    };
    return builder;
  };
  return {
    from: (table: string) => make(byTable[table] ?? { data: null, error: null }),
  } as unknown as Pick<SupabaseClient, 'from'>;
}

describe('householdRepository.activeHousehold', () => {
  it('prefers the owner membership when several exist', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({
        household_members: {
          data: [
            { household_id: 'h-member', role: 'member' },
            { household_id: 'h-owner', role: 'owner' },
          ],
          error: null,
        },
      }),
    });
    expect(await repo.activeHousehold('u-1')).toBe('h-owner');
  });

  it('falls back to the first membership when no owner row', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({
        household_members: {
          data: [
            { household_id: 'h-first', role: 'member' },
            { household_id: 'h-second', role: 'child' },
          ],
          error: null,
        },
      }),
    });
    expect(await repo.activeHousehold('u-1')).toBe('h-first');
  });

  it('returns null when the user has no household', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ household_members: { data: [], error: null } }),
    });
    expect(await repo.activeHousehold('u-1')).toBeNull();
  });

  it('throws when the query errors', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({
        household_members: { data: null, error: { message: 'boom' } },
      }),
    });
    await expect(repo.activeHousehold('u-1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('householdRepository.tier', () => {
  it('returns the stored tier', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({
        subscriptions: { data: { tier: 'household_monthly' }, error: null },
      }),
    });
    expect(await repo.tier('u-1')).toBe('household_monthly');
  });

  it('defaults to free when no subscription row', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ subscriptions: { data: null, error: null } }),
    });
    expect(await repo.tier('u-1')).toBe('free');
  });

  it('defaults to free when the read errors', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ subscriptions: { data: null, error: { message: 'down' } } }),
    });
    expect(await repo.tier('u-1')).toBe('free');
  });

  it('defaults to free on an unrecognized tier value', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ subscriptions: { data: { tier: 'platinum' }, error: null } }),
    });
    expect(await repo.tier('u-1')).toBe('free');
  });
});

describe('householdRepository.currency', () => {
  it('returns the stored currency', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ households: { data: { currency: 'USD' }, error: null } }),
    });
    expect(await repo.currency('h-1')).toBe('USD');
  });

  it('defaults to GBP when no household row', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ households: { data: null, error: null } }),
    });
    expect(await repo.currency('h-1')).toBe('GBP');
  });

  it('defaults to GBP when the read errors', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ households: { data: null, error: { message: 'down' } } }),
    });
    expect(await repo.currency('h-1')).toBe('GBP');
  });

  it('defaults to GBP when the column is null', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ households: { data: { currency: null }, error: null } }),
    });
    expect(await repo.currency('h-1')).toBe('GBP');
  });
});

describe('householdRepository.members', () => {
  it('maps active membership rows', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({
        household_members: {
          data: [
            { user_id: 'u-1', role: 'owner' },
            { user_id: 'u-2', role: 'child' },
          ],
          error: null,
        },
      }),
    });
    expect(await repo.members('h-1')).toEqual([
      { userId: 'u-1', role: 'owner' },
      { userId: 'u-2', role: 'child' },
    ]);
  });

  it('throws when the read errors', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ household_members: { data: null, error: { message: 'boom' } } }),
    });
    await expect(repo.members('h-1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('householdRepository.householdType', () => {
  it('returns the stored type', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({
        households: { data: { household_type: 'roommates' }, error: null },
      }),
    });
    expect(await repo.householdType('h-1')).toBe('roommates');
  });

  it('defaults to family when no row', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ households: { data: null, error: null } }),
    });
    expect(await repo.householdType('h-1')).toBe('family');
  });

  it('defaults to family on an unrecognized value', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ households: { data: { household_type: 'commune' }, error: null } }),
    });
    expect(await repo.householdType('h-1')).toBe('family');
  });
});

describe('householdRepository.setCurrency', () => {
  it('resolves on a successful update', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ households: { data: null, error: null } }),
    });
    await expect(repo.setCurrency('h-1', 'EUR')).resolves.toBeUndefined();
  });

  it('throws when the update errors', async () => {
    const repo = makeHouseholdRepository({
      supabase: stubSupabase({ households: { data: null, error: { message: 'no' } } }),
    });
    await expect(repo.setCurrency('h-1', 'EUR')).rejects.toEqual({ message: 'no' });
  });
});
