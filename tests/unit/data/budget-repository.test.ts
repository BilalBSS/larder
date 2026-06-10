import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { makeBudgetRepository } from '@data/repositories/budget-repository';

interface Result {
  readonly data?: unknown;
  readonly error: unknown;
}

interface Call {
  readonly method: string;
  readonly args: unknown[];
}

const METHODS = [
  'select',
  'eq',
  'is',
  'in',
  'order',
  'limit',
  'update',
  'insert',
  'delete',
] as const;

function stub(results: Result[]) {
  const calls: Call[] = [];
  let index = 0;
  const make = () => {
    const result = results[index] ?? { data: null, error: null };
    index += 1;
    const builder: Record<string, unknown> = {};
    for (const method of METHODS) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return builder;
      };
    }
    builder['then'] = (resolve: (value: Result) => void) => resolve(result);
    return builder;
  };
  const supabase = { from: () => make() } as unknown as Pick<SupabaseClient, 'from'>;
  return { supabase, calls };
}

function budgetRow(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'b-1',
    household_id: 'h-1',
    user_id: null,
    scope: 'household',
    category: null,
    monthly_limit: 640,
    alert_threshold_pct: 80,
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('budgetRepository.listActive', () => {
  it('picks the household row and own personal row', async () => {
    const { supabase } = stub([
      {
        data: [
          budgetRow({}),
          budgetRow({ id: 'b-2', scope: 'personal', user_id: 'u-1', monthly_limit: 200 }),
          budgetRow({ id: 'b-3', scope: 'personal', user_id: 'u-other', monthly_limit: 999 }),
        ],
        error: null,
      },
    ]);
    const repo = makeBudgetRepository({ supabase });
    const budgets = await repo.listActive('h-1', 'u-1');
    expect(budgets.household?.monthlyLimit).toBe(640);
    expect(budgets.personal?.monthlyLimit).toBe(200);
  });

  it('takes the newest row per scope', async () => {
    const { supabase } = stub([
      {
        data: [budgetRow({ id: 'b-new', monthly_limit: 700 }), budgetRow({ monthly_limit: 640 })],
        error: null,
      },
    ]);
    const repo = makeBudgetRepository({ supabase });
    const budgets = await repo.listActive('h-1', 'u-1');
    expect(budgets.household?.id).toBe('b-new');
  });

  it('returns nulls when no budgets exist', async () => {
    const { supabase } = stub([{ data: [], error: null }]);
    const repo = makeBudgetRepository({ supabase });
    expect(await repo.listActive('h-1', 'u-1')).toEqual({ household: null, personal: null });
  });

  it('throws when the read errors', async () => {
    const { supabase } = stub([{ data: null, error: { message: 'boom' } }]);
    const repo = makeBudgetRepository({ supabase });
    await expect(repo.listActive('h-1', 'u-1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('budgetRepository.setHousehold', () => {
  it('updates the existing active row', async () => {
    const { supabase, calls } = stub([{ data: [{ id: 'b-1' }], error: null }, { error: null }]);
    const repo = makeBudgetRepository({ supabase });
    await repo.setHousehold('h-1', 720);
    expect(calls).toContainEqual({ method: 'update', args: [{ monthly_limit: 720 }] });
    expect(calls).toContainEqual({ method: 'eq', args: ['id', 'b-1'] });
    expect(calls.some((call) => call.method === 'insert')).toBe(false);
  });

  it('inserts when no active row exists', async () => {
    const { supabase, calls } = stub([{ data: [], error: null }, { error: null }]);
    const repo = makeBudgetRepository({ supabase });
    await repo.setHousehold('h-1', 640);
    expect(calls).toContainEqual({
      method: 'insert',
      args: [{ household_id: 'h-1', user_id: null, scope: 'household', monthly_limit: 640 }],
    });
    expect(calls).toContainEqual({ method: 'is', args: ['user_id', null] });
  });

  it('throws when the insert errors', async () => {
    const { supabase } = stub([{ data: [], error: null }, { error: { message: 'no' } }]);
    const repo = makeBudgetRepository({ supabase });
    await expect(repo.setHousehold('h-1', 640)).rejects.toEqual({ message: 'no' });
  });
});

describe('budgetRepository.setPersonal', () => {
  it('scopes the lookup and insert to the user', async () => {
    const { supabase, calls } = stub([{ data: [], error: null }, { error: null }]);
    const repo = makeBudgetRepository({ supabase });
    await repo.setPersonal('h-1', 'u-1', 400);
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', 'u-1'] });
    expect(calls).toContainEqual({
      method: 'insert',
      args: [{ household_id: 'h-1', user_id: 'u-1', scope: 'personal', monthly_limit: 400 }],
    });
  });
});

describe('budgetRepository.clear', () => {
  it('deletes household rows by predicate', async () => {
    const { supabase, calls } = stub([{ error: null }]);
    const repo = makeBudgetRepository({ supabase });
    await repo.clearHousehold('h-1');
    expect(calls).toContainEqual({ method: 'delete', args: [] });
    expect(calls).toContainEqual({ method: 'eq', args: ['household_id', 'h-1'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['scope', 'household'] });
    expect(calls).toContainEqual({ method: 'is', args: ['user_id', null] });
  });

  it('deletes personal rows for the user only', async () => {
    const { supabase, calls } = stub([{ error: null }]);
    const repo = makeBudgetRepository({ supabase });
    await repo.clearPersonal('h-1', 'u-1');
    expect(calls).toContainEqual({ method: 'eq', args: ['scope', 'personal'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', 'u-1'] });
  });

  it('throws when the delete errors', async () => {
    const { supabase } = stub([{ error: { message: 'down' } }]);
    const repo = makeBudgetRepository({ supabase });
    await expect(repo.clearHousehold('h-1')).rejects.toEqual({ message: 'down' });
  });
});
