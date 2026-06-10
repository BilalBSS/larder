// / display-ready dashboard model
import type { HouseholdType } from '@domain/entities/household';
import type { Receipt } from '@domain/entities/receipt';

import {
  byCategory,
  byMember,
  byStore,
  deltaPct,
  inMonth,
  keyAt,
  monthBuckets,
  monthLabel,
  scannedBy,
  type CategoryBreakdown,
  type MemberSpend,
  type MonthBucket,
  type StoreSpend,
} from './aggregate';
import { TREND_MONTHS_BACK, type DashboardData } from './get-dashboard';
import { settleUp, type Settlement } from './settle-up';

export type SpendScope = 'household' | 'mine';

export interface BudgetMeterVM {
  readonly limit: number;
  readonly spent: number;
  readonly remaining: number;
  readonly over: number;
}

export interface HeroVM {
  readonly eyebrow: string;
  readonly total: number;
  readonly deltaPct: number | null;
  readonly deltaLabel: string | null;
  readonly budget: BudgetMeterVM | null;
  readonly pendingNote: boolean;
}

export interface MemberRowVM {
  readonly userId: string;
  readonly label: string;
  readonly isYou: boolean;
  readonly total: number;
  readonly receiptCount: number;
  readonly sharePct: number;
}

export interface SettleVM {
  readonly monthLabel: string;
  readonly settlement: Settlement;
}

export interface MembersVM {
  readonly visible: boolean;
  readonly rows: MemberRowVM[];
  readonly footer: string;
  readonly pillAmount: number | null;
  readonly settles: SettleVM[];
}

export interface SpendingViewModel {
  readonly topEyebrow: string;
  readonly hero: HeroVM;
  readonly members: MembersVM;
  readonly trend: { readonly visible: boolean; readonly buckets: MonthBucket[] };
  readonly categories: { readonly visible: boolean; readonly breakdown: CategoryBreakdown };
  readonly stores: { readonly visible: boolean; readonly rows: StoreSpend[] };
  readonly recent: Receipt[];
  readonly noReceipts: boolean;
}

export function defaultScope(householdType: HouseholdType): SpendScope {
  return householdType === 'roommates' || householdType === 'shared' ? 'mine' : 'household';
}

export function memberLabel(
  userId: string,
  selfId: string,
  householdType: HouseholdType,
  former = false,
): string {
  if (userId === selfId) return 'You';
  if (former) return 'Former member';
  if (householdType === 'couple') return 'Partner';
  if (householdType === 'family') return 'Family member';
  return 'Housemate';
}

// / prose money, trimmed pennies
export function proseAmount(glyph: string, amount: number): string {
  const fixed = amount.toFixed(2);
  return `${glyph}${fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed}`;
}

export function buildSpendingViewModel(
  data: DashboardData,
  scope: SpendScope,
  selfId: string,
  glyph: string,
): SpendingViewModel {
  const currentKey = keyAt(data.now, 0);
  const currentLabel = monthLabel(currentKey);
  const priorLabel = monthLabel(keyAt(data.now, 1));

  const scoped = scope === 'mine' ? scannedBy(data.window, selfId) : data.window;
  const scopedCurrent = inMonth(scoped, currentKey);
  const scopedPrior = inMonth(scoped, keyAt(data.now, 1));
  const currentTotal = sumTotals(scopedCurrent);

  const householdCurrent = inMonth(data.window, currentKey);
  const scopedCurrentIds = new Set(scopedCurrent.map((receipt) => receipt.id));
  const scopedLines = data.currentMonthLines.filter((line) => scopedCurrentIds.has(line.receiptId));

  const buckets = monthBuckets(scoped, TREND_MONTHS_BACK, data.now);
  const breakdown = byCategory(scopedLines);
  const stores = byStore(scopedCurrent);

  return {
    topEyebrow: topEyebrow(currentLabel, householdCurrent),
    hero: {
      eyebrow: scope === 'mine' ? `${currentLabel} · you` : `${currentLabel} household total`,
      total: currentTotal,
      deltaPct: deltaPct(currentTotal, sumTotals(scopedPrior)),
      deltaLabel: deltaLabelFor(currentTotal, sumTotals(scopedPrior), priorLabel),
      budget: budgetMeter(data, scope, currentTotal),
      pendingNote:
        data.window.length === 0 && data.recent.some((receipt) => receipt.ocrStatus === 'pending'),
    },
    members: buildMembers(data, selfId, glyph, currentLabel, priorLabel),
    trend: { visible: buckets.some((bucket) => bucket.total > 0), buckets },
    categories: { visible: breakdown.slices.length > 0, breakdown },
    stores: { visible: stores.length > 0, rows: stores },
    recent: data.recent,
    noReceipts: data.recent.length === 0 && data.window.length === 0,
  };
}

function sumTotals(receipts: readonly Receipt[]): number {
  return Math.round(receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0) * 100) / 100;
}

function topEyebrow(currentLabel: string, householdCurrent: readonly Receipt[]): string {
  const count = householdCurrent.length;
  const cooks = new Set(householdCurrent.map((receipt) => receipt.scannedByUserId)).size;
  const receiptsPart = `${count} ${count === 1 ? 'receipt' : 'receipts'}`;
  const cooksPart = cooks > 0 ? ` · ${cooks} ${cooks === 1 ? 'cook' : 'cooks'}` : '';
  return `${currentLabel} · ${receiptsPart}${cooksPart}`;
}

function deltaLabelFor(current: number, prior: number, priorLabel: string): string | null {
  const delta = deltaPct(current, prior);
  if (delta === null) return null;
  return `${Math.abs(delta)}% vs ${priorLabel}`;
}

function budgetMeter(data: DashboardData, scope: SpendScope, spent: number): BudgetMeterVM | null {
  const budget = scope === 'mine' ? data.budgets.personal : data.budgets.household;
  if (budget === null) return null;
  return {
    limit: budget.monthlyLimit,
    spent,
    remaining: Math.max(0, Math.round((budget.monthlyLimit - spent) * 100) / 100),
    over: Math.max(0, Math.round((spent - budget.monthlyLimit) * 100) / 100),
  };
}

// / member data ignores scope
function buildMembers(
  data: DashboardData,
  selfId: string,
  glyph: string,
  currentLabel: string,
  priorLabel: string,
): MembersVM {
  const current = inMonth(data.window, keyAt(data.now, 0));
  const prior = inMonth(data.window, keyAt(data.now, 1));
  const currentSpends = byMember(current, data.members);
  const settle = settleUp(currentSpends, data.members);
  const priorSettle = settleUp(byMember(prior, data.members), data.members);
  const currentTotal = currentSpends.reduce((sum, spend) => sum + spend.total, 0);

  const visible =
    data.members.length >= 2 && (currentTotal > 0 || priorSettle.transfers.length > 0);
  const rows =
    currentTotal > 0 ? currentSpends.map((spend) => toRow(spend, selfId, data.householdType)) : [];

  const settles: SettleVM[] = [];
  if (settle.transfers.length > 0) settles.push({ monthLabel: currentLabel, settlement: settle });
  if (priorSettle.transfers.length > 0) {
    settles.push({ monthLabel: priorLabel, settlement: priorSettle });
  }

  let footer = '';
  let pillAmount: number | null = null;
  if (settle.transfers.length > 0) {
    footer = settleFooter(settle, selfId, glyph, currentLabel, 'Tap settle up for the split.');
    pillAmount = settle.largestTransfer?.amount ?? null;
  } else if (currentTotal > 0) {
    footer = "You're even this month.";
  } else if (priorSettle.transfers.length > 0) {
    footer = settleFooter(
      priorSettle,
      selfId,
      glyph,
      priorLabel,
      `Tap settle up for ${priorLabel}'s split.`,
    );
    pillAmount = priorSettle.largestTransfer?.amount ?? null;
  }

  return { visible, rows, footer, pillAmount, settles };
}

function toRow(spend: MemberSpend, selfId: string, householdType: HouseholdType): MemberRowVM {
  return {
    userId: spend.userId,
    label: memberLabel(spend.userId, selfId, householdType, spend.former),
    isYou: spend.userId === selfId,
    total: spend.total,
    receiptCount: spend.receiptCount,
    sharePct: spend.sharePct,
  };
}

function settleFooter(
  settlement: Settlement,
  selfId: string,
  glyph: string,
  label: string,
  fallback: string,
): string {
  const mine = settlement.transfers.find(
    (transfer) => transfer.fromUserId === selfId || transfer.toUserId === selfId,
  );
  if (mine === undefined) return fallback;
  const amount = proseAmount(glyph, mine.amount);
  return mine.fromUserId === selfId
    ? `You owe ${amount} to even out ${label}.`
    : `You're owed ${amount} to even out ${label}.`;
}
