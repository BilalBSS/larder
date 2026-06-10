// / budget write rules
import type { BudgetRepository } from '@data/repositories/budget-repository';

export type BudgetTarget = 'household' | 'personal';

export interface BudgetInput {
  readonly householdId: string;
  readonly userId: string;
  readonly target: BudgetTarget;
}

export async function setBudget(
  repo: BudgetRepository,
  input: BudgetInput,
  monthlyLimit: number,
): Promise<void> {
  if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) throw new Error('invalid_budget');
  if (input.target === 'household') {
    await repo.setHousehold(input.householdId, monthlyLimit);
    return;
  }
  await repo.setPersonal(input.householdId, input.userId, monthlyLimit);
}

export async function clearBudget(repo: BudgetRepository, input: BudgetInput): Promise<void> {
  if (input.target === 'household') {
    await repo.clearHousehold(input.householdId);
    return;
  }
  await repo.clearPersonal(input.householdId, input.userId);
}
