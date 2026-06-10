// / budget repository
import type { SupabaseClient } from '@supabase/supabase-js';

import { parseBudgetRow, rowToBudget } from '@data/dtos/budget-dto';
import type { Budget } from '@domain/entities/budget';

export interface HouseholdBudgets {
  readonly household: Budget | null;
  readonly personal: Budget | null;
}

export interface BudgetRepository {
  listActive(householdId: string, userId: string): Promise<HouseholdBudgets>;
  setHousehold(householdId: string, monthlyLimit: number): Promise<void>;
  setPersonal(householdId: string, userId: string, monthlyLimit: number): Promise<void>;
  clearHousehold(householdId: string): Promise<void>;
  clearPersonal(householdId: string, userId: string): Promise<void>;
}

export interface BudgetRepositoryDeps {
  readonly supabase: Pick<SupabaseClient, 'from'>;
}

interface ScopeFilter {
  readonly scope: 'household' | 'personal';
  readonly userId: string | null;
}

export function makeBudgetRepository(deps: BudgetRepositoryDeps): BudgetRepository {
  async function activeId(householdId: string, filter: ScopeFilter): Promise<string | null> {
    let query = deps.supabase
      .from('budgets')
      .select('id, created_at')
      .eq('household_id', householdId)
      .eq('scope', filter.scope)
      .is('deleted_at', null);
    query = filter.userId === null ? query.is('user_id', null) : query.eq('user_id', filter.userId);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
    if (error !== null) throw error;
    const first = ((data ?? []) as unknown as { id: string }[])[0];
    return first?.id ?? null;
  }

  async function upsert(
    householdId: string,
    filter: ScopeFilter,
    monthlyLimit: number,
  ): Promise<void> {
    const id = await activeId(householdId, filter);
    if (id !== null) {
      const { error } = await deps.supabase
        .from('budgets')
        .update({ monthly_limit: monthlyLimit })
        .eq('id', id);
      if (error !== null) throw error;
      return;
    }
    const { error } = await deps.supabase.from('budgets').insert({
      household_id: householdId,
      user_id: filter.userId,
      scope: filter.scope,
      monthly_limit: monthlyLimit,
    });
    if (error !== null) throw error;
  }

  async function remove(householdId: string, filter: ScopeFilter): Promise<void> {
    let query = deps.supabase
      .from('budgets')
      .delete()
      .eq('household_id', householdId)
      .eq('scope', filter.scope);
    query = filter.userId === null ? query.is('user_id', null) : query.eq('user_id', filter.userId);
    const { error } = await query;
    if (error !== null) throw error;
  }

  return {
    async listActive(householdId, userId) {
      const { data, error } = await deps.supabase
        .from('budgets')
        .select('*')
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .in('scope', ['household', 'personal'])
        .order('created_at', { ascending: false });
      if (error !== null) throw error;
      const budgets = ((data ?? []) as unknown[]).map((row) => rowToBudget(parseBudgetRow(row)));
      return {
        household: budgets.find((budget) => budget.scope === 'household') ?? null,
        personal:
          budgets.find((budget) => budget.scope === 'personal' && budget.userId === userId) ?? null,
      };
    },

    setHousehold: (householdId, monthlyLimit) =>
      upsert(householdId, { scope: 'household', userId: null }, monthlyLimit),
    setPersonal: (householdId, userId, monthlyLimit) =>
      upsert(householdId, { scope: 'personal', userId }, monthlyLimit),
    clearHousehold: (householdId) => remove(householdId, { scope: 'household', userId: null }),
    clearPersonal: (householdId, userId) => remove(householdId, { scope: 'personal', userId }),
  };
}
