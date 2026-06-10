// / dashboard data fetch
import type { HouseholdBudgets } from '@data/repositories/budget-repository';
import type { HouseholdMember } from '@domain/entities/household-member';
import type { HouseholdType } from '@domain/entities/household';
import type { Receipt } from '@domain/entities/receipt';
import type { ReceiptLineItem } from '@domain/entities/receipt-line-item';

import { inMonth, keyAt, windowBounds } from './aggregate';

export const TREND_MONTHS_BACK = 5;

export interface DashboardData {
  readonly window: Receipt[];
  readonly currentMonthLines: ReceiptLineItem[];
  readonly recent: Receipt[];
  readonly budgets: HouseholdBudgets;
  readonly members: HouseholdMember[];
  readonly householdType: HouseholdType;
  readonly now: Date;
}

export interface DashboardRepos {
  listReceiptsBetween(householdId: string, fromIso: string, toIso: string): Promise<Receipt[]>;
  listLineItemsByReceiptIds(householdId: string, receiptIds: string[]): Promise<ReceiptLineItem[]>;
  listRecent(householdId: string, limit: number): Promise<Receipt[]>;
  listBudgets(householdId: string, userId: string): Promise<HouseholdBudgets>;
  listMembers(householdId: string): Promise<HouseholdMember[]>;
  householdType(householdId: string): Promise<HouseholdType>;
}

export async function getDashboard(
  repos: DashboardRepos,
  householdId: string,
  userId: string,
  now: Date = new Date(),
): Promise<DashboardData> {
  const bounds = windowBounds(now, TREND_MONTHS_BACK);
  const [window, recent, budgets, members, householdType] = await Promise.all([
    repos.listReceiptsBetween(householdId, bounds.fromIso, bounds.toIso),
    repos.listRecent(householdId, 5),
    repos.listBudgets(householdId, userId),
    repos.listMembers(householdId),
    repos.householdType(householdId),
  ]);
  const currentIds = inMonth(window, keyAt(now, 0)).map((receipt) => receipt.id);
  const currentMonthLines = await repos.listLineItemsByReceiptIds(householdId, currentIds);
  return { window, currentMonthLines, recent, budgets, members, householdType, now };
}
