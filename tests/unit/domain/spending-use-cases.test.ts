import { describe, expect, it, vi } from 'vitest';

import type { BudgetRepository } from '@data/repositories/budget-repository';
import type { Receipt } from '@domain/entities/receipt';
import { getDashboard, type DashboardRepos } from '@domain/use-cases/spending/get-dashboard';
import { clearBudget, setBudget, type BudgetInput } from '@domain/use-cases/spending/set-budget';

const NOW = new Date('2026-06-10T08:00:00.000Z');

function makeReceipt(id: string, purchasedAt: string): Receipt {
  return {
    id,
    householdId: 'h-1',
    scannedByUserId: 'u-1',
    storeName: 'Aldi',
    totalAmount: 10,
    taxAmount: null,
    purchasedAt,
    ocrStatus: 'succeeded',
    ocrConfidence: null,
    reconciledAt: null,
    createdAt: purchasedAt,
  };
}

function makeRepos(window: Receipt[]): DashboardRepos {
  return {
    listReceiptsBetween: vi.fn().mockResolvedValue(window),
    listLineItemsByReceiptIds: vi.fn().mockResolvedValue([]),
    listRecent: vi.fn().mockResolvedValue([]),
    listBudgets: vi.fn().mockResolvedValue({ household: null, personal: null }),
    listMembers: vi.fn().mockResolvedValue([{ userId: 'u-1', role: 'owner' }]),
    householdType: vi.fn().mockResolvedValue('couple'),
  };
}

describe('getDashboard', () => {
  it('windows six utc months and fetches current-month lines only', async () => {
    const repos = makeRepos([
      makeReceipt('r-jun', '2026-06-02T00:00:00.000Z'),
      makeReceipt('r-may', '2026-05-20T00:00:00.000Z'),
    ]);
    const data = await getDashboard(repos, 'h-1', 'u-1', NOW);
    expect(repos.listReceiptsBetween).toHaveBeenCalledWith(
      'h-1',
      '2026-01-01T00:00:00.000Z',
      '2026-07-01T00:00:00.000Z',
    );
    expect(repos.listLineItemsByReceiptIds).toHaveBeenCalledWith('h-1', ['r-jun']);
    expect(repos.listRecent).toHaveBeenCalledWith('h-1', 5);
    expect(repos.listBudgets).toHaveBeenCalledWith('h-1', 'u-1');
    expect(data.householdType).toBe('couple');
    expect(data.window).toHaveLength(2);
    expect(data.now).toBe(NOW);
  });
});

function budgetRepoStub(): BudgetRepository {
  return {
    listActive: vi.fn(),
    setHousehold: vi.fn().mockResolvedValue(undefined),
    setPersonal: vi.fn().mockResolvedValue(undefined),
    clearHousehold: vi.fn().mockResolvedValue(undefined),
    clearPersonal: vi.fn().mockResolvedValue(undefined),
  };
}

const HOUSEHOLD_INPUT: BudgetInput = { householdId: 'h-1', userId: 'u-1', target: 'household' };
const PERSONAL_INPUT: BudgetInput = { householdId: 'h-1', userId: 'u-1', target: 'personal' };

describe('setBudget', () => {
  it('routes household budgets', async () => {
    const repo = budgetRepoStub();
    await setBudget(repo, HOUSEHOLD_INPUT, 640);
    expect(repo.setHousehold).toHaveBeenCalledWith('h-1', 640);
    expect(repo.setPersonal).not.toHaveBeenCalled();
  });

  it('routes personal caps', async () => {
    const repo = budgetRepoStub();
    await setBudget(repo, PERSONAL_INPUT, 400);
    expect(repo.setPersonal).toHaveBeenCalledWith('h-1', 'u-1', 400);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %s without touching the repo',
    async (value) => {
      const repo = budgetRepoStub();
      await expect(setBudget(repo, HOUSEHOLD_INPUT, value)).rejects.toThrow('invalid_budget');
      expect(repo.setHousehold).not.toHaveBeenCalled();
    },
  );
});

describe('clearBudget', () => {
  it('routes household clears', async () => {
    const repo = budgetRepoStub();
    await clearBudget(repo, HOUSEHOLD_INPUT);
    expect(repo.clearHousehold).toHaveBeenCalledWith('h-1');
  });

  it('routes personal clears', async () => {
    const repo = budgetRepoStub();
    await clearBudget(repo, PERSONAL_INPUT);
    expect(repo.clearPersonal).toHaveBeenCalledWith('h-1', 'u-1');
  });
});
