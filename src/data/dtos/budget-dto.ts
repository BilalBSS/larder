// / budget row dto
import { z } from 'zod';

import type { Budget } from '@domain/entities/budget';

export const BudgetRowSchema = z.object({
  id: z.string(),
  household_id: z.string(),
  user_id: z.string().nullable(),
  scope: z.enum(['household', 'personal', 'category']),
  category: z.string().nullable(),
  monthly_limit: z.number(),
  alert_threshold_pct: z.number(),
});

export type BudgetRow = z.infer<typeof BudgetRowSchema>;

export function rowToBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    scope: row.scope,
    category: row.category,
    monthlyLimit: row.monthly_limit,
    alertThresholdPct: row.alert_threshold_pct,
  };
}

export function parseBudgetRow(raw: unknown): BudgetRow {
  return BudgetRowSchema.parse(raw);
}
