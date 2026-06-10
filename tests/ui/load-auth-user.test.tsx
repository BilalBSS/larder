import type { SupabaseClient } from '@supabase/supabase-js';

import { makeLoadAuthUser } from '@domain/use-cases/auth/load-current-user';

interface Row {
  readonly household_id?: string;
  readonly role?: string;
  readonly tier?: string;
  readonly currency?: string;
}

// / chainable query stub
function table(rows: Row[], single: Row | null) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => Promise.resolve({ data: rows, error: null }),
    maybeSingle: () => Promise.resolve({ data: single, error: null }),
  };
  return builder;
}

function fakeSupabase(
  members: Row[],
  subscription: Row | null,
  household: Row | null = null,
): Pick<SupabaseClient, 'from'> {
  const from = (name: string) => {
    if (name === 'household_members') return table(members, null);
    if (name === 'households') return table([], household);
    return table([], subscription);
  };
  return { from } as unknown as Pick<SupabaseClient, 'from'>;
}

describe('makeLoadAuthUser', () => {
  it('wires the household repo into an auth user', async () => {
    const load = makeLoadAuthUser(
      fakeSupabase(
        [{ household_id: 'h-1', role: 'owner' }],
        { tier: 'household_yearly' },
        { currency: 'EUR' },
      ),
    );
    expect(await load('u-1')).toEqual({
      id: 'u-1',
      household_id: 'h-1',
      tier: 'household_yearly',
      currency: 'EUR',
    });
  });

  it('returns a null household, free tier, and default currency for a fresh user', async () => {
    const load = makeLoadAuthUser(fakeSupabase([], null));
    expect(await load('u-2')).toEqual({
      id: 'u-2',
      household_id: null,
      tier: 'free',
      currency: 'GBP',
    });
  });
});
