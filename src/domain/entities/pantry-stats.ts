// / pantry glance stats
import { daysLeft } from './pantry-expiry';
import type { PantrySection } from './group-pantry';
import type { PantryItem } from './pantry-item';

const AT_RISK_DAYS = 4;

// / value expiring soon
export function atRiskValue(items: PantryItem[], now: Date): number {
  return items.reduce((sum, item) => {
    if (item.isFrozen || item.lastUnitCost === null) return sum;
    const days = daysLeft(item, now);
    if (days === null || days > AT_RISK_DAYS) return sum;
    return sum + item.quantity * item.lastUnitCost;
  }, 0);
}

// / count expiring soon
export function atRiskCount(items: PantryItem[], now: Date): number {
  return items.reduce((count, item) => {
    if (item.isFrozen) return count;
    const days = daysLeft(item, now);
    if (days === null || days > AT_RISK_DAYS) return count;
    return count + 1;
  }, 0);
}

export function countUseFirst(sections: PantrySection[]): number {
  return sections.find((section) => section.key === 'urgent')?.items.length ?? 0;
}
