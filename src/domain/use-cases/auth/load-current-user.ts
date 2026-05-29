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
  return { id: userId, household_id, tier };
}

export function makeLoadAuthUser(supabase: HouseholdRepositoryDeps['supabase']): LoadAuthUser {
  const householdRepo = makeHouseholdRepository({ supabase });
  return (userId) => loadCurrentUser({ householdRepo }, userId);
}
