// / set household currency
import type { HouseholdRepository } from '@data/repositories/household-repository';
import { isSupportedCurrency } from '@foundation/currency';

export async function setHouseholdCurrency(
  repo: HouseholdRepository,
  householdId: string,
  code: string,
): Promise<void> {
  if (!isSupportedCurrency(code)) throw new Error('unsupported_currency');
  await repo.setCurrency(householdId, code);
}
