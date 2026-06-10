// / budget entity
export type BudgetScope = 'household' | 'personal' | 'category';

export interface Budget {
  readonly id: string;
  readonly householdId: string;
  readonly userId: string | null;
  readonly scope: BudgetScope;
  readonly category: string | null;
  readonly monthlyLimit: number;
  readonly alertThresholdPct: number;
}
