import { describe, expect, it, vi } from 'vitest';

import type { HouseholdRepository } from '@data/repositories/household-repository';
import { setHouseholdCurrency } from '@domain/use-cases/household';

function fakeRepo(overrides: Partial<HouseholdRepository> = {}): HouseholdRepository {
  return {
    activeHousehold: async () => null,
    tier: async () => 'free',
    currency: async () => 'GBP',
    setCurrency: async () => undefined,
    ...overrides,
  };
}

describe('setHouseholdCurrency', () => {
  it('updates a supported currency', async () => {
    const setCurrency = vi.fn(async () => undefined);
    await setHouseholdCurrency(fakeRepo({ setCurrency }), 'h-1', 'USD');
    expect(setCurrency).toHaveBeenCalledWith('h-1', 'USD');
  });

  it('rejects an unsupported currency', async () => {
    const setCurrency = vi.fn(async () => undefined);
    await expect(setHouseholdCurrency(fakeRepo({ setCurrency }), 'h-1', 'XYZ')).rejects.toThrow(
      'unsupported_currency',
    );
    expect(setCurrency).not.toHaveBeenCalled();
  });
});
