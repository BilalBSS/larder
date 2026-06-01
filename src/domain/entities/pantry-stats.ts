// / pantry glance stats
import type { PantrySection } from './group-pantry';
import type { PantryItem } from './pantry-item';

export function totalValue(items: PantryItem[]): number {
  return items.reduce(
    (sum, item) => (item.lastUnitCost === null ? sum : sum + item.quantity * item.lastUnitCost),
    0,
  );
}

export function countUseFirst(sections: PantrySection[]): number {
  return sections.find((section) => section.key === 'urgent')?.items.length ?? 0;
}
