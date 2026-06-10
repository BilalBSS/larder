// / wired household service
import { makeHouseholdRepository } from '@data/repositories/household-repository';
import { supabase } from '@foundation/auth/supabase';

import { setHouseholdCurrency } from './set-currency';

export interface HouseholdService {
  setCurrency(householdId: string, code: string): Promise<void>;
}

const repo = makeHouseholdRepository({ supabase });

export const householdService: HouseholdService = {
  setCurrency: (householdId, code) => setHouseholdCurrency(repo, householdId, code),
};
