// / wired spending service
import { makeBudgetRepository, type HouseholdBudgets } from '@data/repositories/budget-repository';
import { makeHouseholdRepository } from '@data/repositories/household-repository';
import { makeReceiptRepository } from '@data/repositories/receipt-repository';
import { makeSpendingRepository } from '@data/repositories/spending-repository';
import { supabase } from '@foundation/auth/supabase';

import { getDashboard, type DashboardData } from './get-dashboard';
import { clearBudget, setBudget, type BudgetInput } from './set-budget';

export type { HouseholdBudgets } from '@data/repositories/budget-repository';

export interface SpendingService {
  dashboard(householdId: string, userId: string): Promise<DashboardData>;
  budgets(householdId: string, userId: string): Promise<HouseholdBudgets>;
  setBudget(input: BudgetInput, monthlyLimit: number): Promise<void>;
  clearBudget(input: BudgetInput): Promise<void>;
}

const spendingRepo = makeSpendingRepository({ supabase });
const budgetRepo = makeBudgetRepository({ supabase });
const receiptRepo = makeReceiptRepository({ supabase });
const householdRepo = makeHouseholdRepository({ supabase });

export const spendingService: SpendingService = {
  dashboard: (householdId, userId) =>
    getDashboard(
      {
        listReceiptsBetween: spendingRepo.listReceiptsBetween,
        listLineItemsByReceiptIds: spendingRepo.listLineItemsByReceiptIds,
        listRecent: receiptRepo.list,
        listBudgets: budgetRepo.listActive,
        listMembers: householdRepo.members,
        householdType: householdRepo.householdType,
      },
      householdId,
      userId,
    ),
  budgets: (householdId, userId) => budgetRepo.listActive(householdId, userId),
  setBudget: (input, monthlyLimit) => setBudget(budgetRepo, input, monthlyLimit),
  clearBudget: (input) => clearBudget(budgetRepo, input),
};
