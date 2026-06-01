import { describe, expect, it } from 'vitest';

import { daysLeft, freshnessTone, groupingTone } from '@domain/entities/pantry-expiry';

interface Source {
  expirationDate: string | null;
  estimatedExpirationDays: number | null;
  lastPurchasedAt: string | null;
  isFrozen: boolean;
}

function mk(overrides: Partial<Source> = {}): Source {
  return {
    expirationDate: null,
    estimatedExpirationDays: null,
    lastPurchasedAt: null,
    isFrozen: false,
    ...overrides,
  };
}

// / local date offset
function localDateStr(base: Date, offsetDays: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const NOON = new Date(2026, 5, 1, 12, 0);

describe('daysLeft', () => {
  it('uses an explicit expiration date', () => {
    expect(daysLeft(mk({ expirationDate: localDateStr(NOON, 3) }), NOON)).toBe(3);
    expect(daysLeft(mk({ expirationDate: localDateStr(NOON, 0) }), NOON)).toBe(0);
    expect(daysLeft(mk({ expirationDate: localDateStr(NOON, -2) }), NOON)).toBe(-2);
  });

  it('falls back to purchase date plus estimate', () => {
    const purchased = new Date(2026, 5, 1, 8, 0).toISOString();
    expect(daysLeft(mk({ lastPurchasedAt: purchased, estimatedExpirationDays: 7 }), NOON)).toBe(7);
  });

  it('returns null without any date source', () => {
    expect(daysLeft(mk(), NOON)).toBeNull();
    expect(daysLeft(mk({ lastPurchasedAt: NOON.toISOString() }), NOON)).toBeNull();
    expect(daysLeft(mk({ estimatedExpirationDays: 5 }), NOON)).toBeNull();
  });

  it('returns null for an unparseable date', () => {
    expect(daysLeft(mk({ expirationDate: 'not-a-date' }), NOON)).toBeNull();
  });

  it('counts calendar days in device-local time at the day boundary', () => {
    const lateEvening = new Date(2026, 5, 1, 23, 30);
    expect(daysLeft(mk({ expirationDate: '2026-06-02' }), lateEvening)).toBe(1);
    const earlyMorning = new Date(2026, 5, 1, 0, 30);
    expect(daysLeft(mk({ expirationDate: '2026-06-01' }), earlyMorning)).toBe(0);
  });
});

describe('freshnessTone', () => {
  it('maps day counts to tones at the boundaries', () => {
    expect(freshnessTone(mk({ expirationDate: localDateStr(NOON, -1) }), NOON)).toBe('gone');
    expect(freshnessTone(mk({ expirationDate: localDateStr(NOON, 0) }), NOON)).toBe('urgent');
    expect(freshnessTone(mk({ expirationDate: localDateStr(NOON, 2) }), NOON)).toBe('urgent');
    expect(freshnessTone(mk({ expirationDate: localDateStr(NOON, 3) }), NOON)).toBe('soon');
    expect(freshnessTone(mk({ expirationDate: localDateStr(NOON, 4) }), NOON)).toBe('soon');
    expect(freshnessTone(mk({ expirationDate: localDateStr(NOON, 5) }), NOON)).toBe('fresh');
  });

  it('treats an unknown date as fresh', () => {
    expect(freshnessTone(mk(), NOON)).toBe('fresh');
  });

  it('ignores the frozen flag', () => {
    expect(
      freshnessTone(mk({ expirationDate: localDateStr(NOON, -1), isFrozen: true }), NOON),
    ).toBe('gone');
  });
});

describe('groupingTone', () => {
  it('lets frozen win over expiry', () => {
    expect(groupingTone(mk({ expirationDate: localDateStr(NOON, -3), isFrozen: true }), NOON)).toBe(
      'frozen',
    );
  });

  it('falls through to freshness when not frozen', () => {
    expect(groupingTone(mk({ expirationDate: localDateStr(NOON, -1) }), NOON)).toBe('gone');
    expect(groupingTone(mk({ expirationDate: localDateStr(NOON, 1) }), NOON)).toBe('urgent');
  });
});
