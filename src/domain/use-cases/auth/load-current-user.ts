// / session to auth user
import {
  makeHouseholdRepository,
  type HouseholdRepository,
  type HouseholdRepositoryDeps,
} from '@data/repositories/household-repository';
import type { AuthUser, LoadAuthUser } from '@foundation/context';

export interface LoadCurrentUserDeps {
  readonly householdRepo: HouseholdRepository;
}

export async function loadCurrentUser(
  deps: LoadCurrentUserDeps,
  userId: string,
): Promise<AuthUser> {
  const [household_id, tier] = await Promise.all([
    deps.householdRepo.activeHousehold(userId),
    deps.householdRepo.tier(userId),
  ]);
  const currency = household_id === null ? 'GBP' : await deps.householdRepo.currency(household_id);
  return { id: userId, household_id, tier, currency };
}

export function makeLoadAuthUser(supabase: HouseholdRepositoryDeps['supabase']): LoadAuthUser {
  const householdRepo = makeHouseholdRepository({ supabase });
  return (userId) => loadCurrentUser({ householdRepo }, userId);
}
