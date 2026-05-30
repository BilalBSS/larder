import { describe, expect, it } from 'vitest';

import { groupByUrgency } from '@domain/entities/group-pantry';
import type { PantryItem } from '@domain/entities/pantry-item';

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

describe('groupByUrgency', () => {
  it('buckets items into ordered, titled sections', () => {
    const sections = groupByUrgency(
      [
        mk({ id: 'urgent', expirationDate: localDateStr(NOON, 1) }),
        mk({ id: 'soon', expirationDate: localDateStr(NOON, 3) }),
        mk({ id: 'fresh', expirationDate: localDateStr(NOON, 9) }),
        mk({ id: 'frozen', isFrozen: true }),
      ],
      NOON,
    );
    expect(sections.map((s) => s.key)).toEqual(['urgent', 'soon', 'fresh', 'frozen']);
    expect(sections.map((s) => s.title)).toEqual(['Use first', 'This week', 'Fresh', 'Frozen']);
  });

  it('folds expired items into use-first, most overdue first', () => {
    const sections = groupByUrgency(
      [
        mk({ id: 'soon-ish', expirationDate: localDateStr(NOON, 1) }),
        mk({ id: 'very-overdue', expirationDate: localDateStr(NOON, -5) }),
        mk({ id: 'just-overdue', expirationDate: localDateStr(NOON, -1) }),
      ],
      NOON,
    );
    const urgent = sections.find((s) => s.key === 'urgent');
    expect(urgent?.items.map((i) => i.id)).toEqual(['very-overdue', 'just-overdue', 'soon-ish']);
  });

  it('keeps frozen items out of the fresh bucket', () => {
    const sections = groupByUrgency(
      [mk({ id: 'frozen-fresh', expirationDate: localDateStr(NOON, 9), isFrozen: true })],
      NOON,
    );
    expect(sections.map((s) => s.key)).toEqual(['frozen']);
  });

  it('sorts within a bucket by days left with nulls last', () => {
    const sections = groupByUrgency(
      [
        mk({ id: 'six', expirationDate: localDateStr(NOON, 6) }),
        mk({ id: 'unknown' }),
        mk({ id: 'five', expirationDate: localDateStr(NOON, 5) }),
      ],
      NOON,
    );
    const fresh = sections.find((s) => s.key === 'fresh');
    expect(fresh?.items.map((i) => i.id)).toEqual(['five', 'six', 'unknown']);
  });

  it('drops empty sections', () => {
    const sections = groupByUrgency([mk({ expirationDate: localDateStr(NOON, 9) })], NOON);
    expect(sections.map((s) => s.key)).toEqual(['fresh']);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByUrgency([], NOON)).toEqual([]);
  });
});
