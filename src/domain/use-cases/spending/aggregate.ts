// / spending aggregation
import type { HouseholdMember } from '@domain/entities/household-member';
import type { Receipt } from '@domain/entities/receipt';
import type { ReceiptLineItem } from '@domain/entities/receipt-line-item';

export interface MonthBucket {
  readonly key: string;
  readonly label: string;
  readonly total: number;
  readonly current: boolean;
}

export interface MemberSpend {
  readonly userId: string;
  readonly total: number;
  readonly receiptCount: number;
  readonly sharePct: number;
  readonly former: boolean;
}

export interface StoreSpend {
  readonly name: string;
  readonly total: number;
  readonly receiptCount: number;
  readonly average: number;
}

export interface CategorySlice {
  readonly name: string;
  readonly total: number;
  readonly pct: number;
}

export interface CategoryBreakdown {
  readonly slices: CategorySlice[];
  readonly itemizedTotal: number;
}

export const OTHER_CATEGORY = 'Other';
export const UNKNOWN_STORE = 'Unknown store';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

// / all month math utc
export function monthKey(iso: string): string {
  const date = new Date(iso);
  return keyFor(date.getUTCFullYear(), date.getUTCMonth());
}

export function keyAt(now: Date, monthsBack: number): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));
  return keyFor(date.getUTCFullYear(), date.getUTCMonth());
}

export function monthLabel(key: string): string {
  return MONTHS[Number(key.slice(5)) - 1] ?? '';
}

export function monthLabelFull(key: string): string {
  return MONTHS_FULL[Number(key.slice(5)) - 1] ?? '';
}

export function windowBounds(now: Date, monthsBack: number): { fromIso: string; toIso: string } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    fromIso: new Date(Date.UTC(year, month - monthsBack, 1)).toISOString(),
    toIso: new Date(Date.UTC(year, month + 1, 1)).toISOString(),
  };
}

export function monthBuckets(
  receipts: readonly Receipt[],
  monthsBack: number,
  now: Date,
): MonthBucket[] {
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    const key = monthKey(receipt.purchasedAt);
    totals.set(key, (totals.get(key) ?? 0) + receipt.totalAmount);
  }
  const buckets: MonthBucket[] = [];
  for (let back = monthsBack; back >= 0; back -= 1) {
    const key = keyAt(now, back);
    buckets.push({
      key,
      label: monthLabel(key),
      total: round2(totals.get(key) ?? 0),
      current: back === 0,
    });
  }
  return buckets;
}

export function inMonth(receipts: readonly Receipt[], key: string): Receipt[] {
  return receipts.filter((receipt) => monthKey(receipt.purchasedAt) === key);
}

export function scannedBy(receipts: readonly Receipt[], userId: string): Receipt[] {
  return receipts.filter((receipt) => receipt.scannedByUserId === userId);
}

// / former scanners kept, flagged
export function byMember(
  receipts: readonly Receipt[],
  members: readonly HouseholdMember[],
): MemberSpend[] {
  const known = new Set(members.map((member) => member.userId));
  const totals = new Map<string, { total: number; count: number }>();
  for (const receipt of receipts) {
    const entry = totals.get(receipt.scannedByUserId) ?? { total: 0, count: 0 };
    entry.total += receipt.totalAmount;
    entry.count += 1;
    totals.set(receipt.scannedByUserId, entry);
  }
  const sectionTotal = [...totals.values()].reduce((sum, entry) => sum + entry.total, 0);
  const rows: MemberSpend[] = members.map((member) => {
    const entry = totals.get(member.userId);
    return {
      userId: member.userId,
      total: round2(entry?.total ?? 0),
      receiptCount: entry?.count ?? 0,
      sharePct: pct(entry?.total ?? 0, sectionTotal),
      former: false,
    };
  });
  for (const [userId, entry] of totals) {
    if (!known.has(userId)) {
      rows.push({
        userId,
        total: round2(entry.total),
        receiptCount: entry.count,
        sharePct: pct(entry.total, sectionTotal),
        former: true,
      });
    }
  }
  return rows.sort((a, b) => b.total - a.total || a.userId.localeCompare(b.userId));
}

export function byStore(receipts: readonly Receipt[]): StoreSpend[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const receipt of receipts) {
    const name = receipt.storeName ?? UNKNOWN_STORE;
    const entry = totals.get(name) ?? { total: 0, count: 0 };
    entry.total += receipt.totalAmount;
    entry.count += 1;
    totals.set(name, entry);
  }
  return [...totals.entries()]
    .map(([name, entry]) => ({
      name,
      total: round2(entry.total),
      receiptCount: entry.count,
      average: round2(entry.total / entry.count),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

// / top slices, rest folded
export function byCategory(lineItems: readonly ReceiptLineItem[], topCount = 4): CategoryBreakdown {
  const totals = new Map<string, number>();
  let itemized = 0;
  let other = 0;
  for (const line of lineItems) {
    itemized += line.lineTotal;
    const name = normalizeCategory(line.category);
    if (name === null) {
      other += line.lineTotal;
    } else {
      totals.set(name, (totals.get(name) ?? 0) + line.lineTotal);
    }
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [, total] of ranked.slice(topCount)) other += total;
  const slices: CategorySlice[] = ranked
    .slice(0, topCount)
    .map(([name, total]) => ({ name, total: round2(total), pct: pct(total, itemized) }));
  if (other > 0) {
    slices.push({ name: OTHER_CATEGORY, total: round2(other), pct: pct(other, itemized) });
  }
  return { slices, itemizedTotal: round2(itemized) };
}

export function deltaPct(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}

// / blank and literal other
function normalizeCategory(category: string | null): string | null {
  if (category === null) return null;
  const trimmed = category.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'other') return null;
  const head = trimmed[0];
  return head === undefined ? null : head.toUpperCase() + trimmed.slice(1);
}

function keyFor(year: number, monthIndex: number): string {
  return `${year}-${`${monthIndex + 1}`.padStart(2, '0')}`;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
