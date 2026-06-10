import { describe, expect, it } from 'vitest';

import type { HouseholdRepository } from '@data/repositories/household-repository';
import { loadCurrentUser } from '@domain/use-cases/auth/load-current-user';

function repoStub(overrides: Partial<HouseholdRepository> = {}): HouseholdRepository {
  return {
    activeHousehold: async () => 'h-1',
    tier: async () => 'free',
    currency: async () => 'GBP',
    setCurrency: async () => undefined,
    members: async () => [],
    householdType: async () => 'family',
    ...overrides,
  };
}

describe('loadCurrentUser', () => {
  it('builds an auth user from household, tier, and currency', async () => {
    const user = await loadCurrentUser(
      {
        householdRepo: repoStub({
          activeHousehold: async () => 'h-9',
          tier: async () => 'household_yearly',
          currency: async () => 'USD',
        }),
      },
      'u-1',
    );
    expect(user).toEqual({
      id: 'u-1',
      household_id: 'h-9',
      tier: 'household_yearly',
      currency: 'USD',
    });
  });

  it('defaults currency to GBP without a household', async () => {
    const user = await loadCurrentUser(
      { householdRepo: repoStub({ activeHousehold: async () => null }) },
      'u-2',
    );
    expect(user).toEqual({ id: 'u-2', household_id: null, tier: 'free', currency: 'GBP' });
  });

  it('defaults to the free tier', async () => {
    const user = await loadCurrentUser({ householdRepo: repoStub() }, 'u-3');
    expect(user.tier).toBe('free');
  });
});
