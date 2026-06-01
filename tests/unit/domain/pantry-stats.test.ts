import { describe, expect, it } from 'vitest';

import { groupByUrgency } from '@domain/entities/group-pantry';
import type { PantryItem } from '@domain/entities/pantry-item';
import { totalValue, countUseFirst } from '@domain/entities/pantry-stats';

function mk(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: 'i-1',
    householdId: 'h-1',
    canonicalName: 'bananas',
    displayName: 'Bananas',
    category: 'produce',
    quantity: 1,
    unit: 'count',
    expirationDate: null,
    estimatedExpirationDays: null,
    lastPurchasedAt: null,
    lastUnitCost: null,
    notes: null,
    isFrozen: false,
    createdByUserId: 'u-1',
    updatedByUserId: 'u-1',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function localDateStr(base: Date, offsetDays: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const NOON = new Date(2026, 5, 1, 12, 0);

describe('totalValue', () => {
  it('sums quantity times unit cost', () => {
    expect(
      totalValue([mk({ quantity: 2, lastUnitCost: 1.5 }), mk({ quantity: 3, lastUnitCost: 2 })]),
    ).toBe(9);
  });

  it('skips items with no cost', () => {
    expect(
      totalValue([mk({ quantity: 2, lastUnitCost: null }), mk({ quantity: 3, lastUnitCost: 2 })]),
    ).toBe(6);
  });

  it('is zero for an empty pantry', () => {
    expect(totalValue([])).toBe(0);
  });
});

describe('countUseFirst', () => {
  it('returns the use-first section length', () => {
    const sections = groupByUrgency(
      [
        mk({ id: 'a', expirationDate: localDateStr(NOON, 1) }),
        mk({ id: 'b', expirationDate: localDateStr(NOON, -2) }),
        mk({ id: 'c', expirationDate: localDateStr(NOON, 9) }),
      ],
      NOON,
    );
    expect(countUseFirst(sections)).toBe(2);
  });

  it('is zero when nothing is urgent', () => {
    const sections = groupByUrgency([mk({ expirationDate: localDateStr(NOON, 9) })], NOON);
    expect(countUseFirst(sections)).toBe(0);
  });

  it('matches the urgent section length for any list', () => {
    const items = [
      mk({ id: 'a', expirationDate: localDateStr(NOON, 1) }),
      mk({ id: 'b', expirationDate: localDateStr(NOON, -2) }),
      mk({ id: 'c', expirationDate: localDateStr(NOON, 3) }),
      mk({ id: 'd', isFrozen: true }),
    ];
    const sections = groupByUrgency(items, NOON);
    const urgentLength = sections.find((s) => s.key === 'urgent')?.items.length ?? 0;
    expect(countUseFirst(sections)).toBe(urgentLength);
  });
});
