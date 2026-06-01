// / device-local expiry math
import type { PantryItem } from './pantry-item';

export type UrgencyTone = 'urgent' | 'soon' | 'fresh' | 'frozen' | 'gone';

const DAY_MS = 86_400_000;

type ExpirySource = Pick<
  PantryItem,
  'expirationDate' | 'estimatedExpirationDays' | 'lastPurchasedAt'
>;

type ToneSource = ExpirySource & Pick<PantryItem, 'isFrozen'>;

function localMidnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// / parse date-only as local
function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match === null) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function daysLeft(item: ExpirySource, now: Date): number | null {
  const today = localMidnight(now);
  if (item.expirationDate !== null) {
    const explicit = parseDateOnly(item.expirationDate);
    if (explicit === null) return null;
    return Math.round((localMidnight(explicit) - today) / DAY_MS);
  }
  if (item.lastPurchasedAt !== null && item.estimatedExpirationDays !== null) {
    const purchased = new Date(item.lastPurchasedAt);
    if (Number.isNaN(purchased.getTime())) return null;
    const estimated = localMidnight(purchased) + item.estimatedExpirationDays * DAY_MS;
    return Math.round((estimated - today) / DAY_MS);
  }
  return null;
}

export function freshnessTone(item: ExpirySource, now: Date): UrgencyTone {
  const days = daysLeft(item, now);
  if (days === null) return 'fresh';
  if (days < 0) return 'gone';
  if (days <= 2) return 'urgent';
  if (days <= 4) return 'soon';
  return 'fresh';
}

export function groupingTone(item: ToneSource, now: Date): UrgencyTone {
  return item.isFrozen ? 'frozen' : freshnessTone(item, now);
}
