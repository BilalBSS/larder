import { describe, expect, it } from 'vitest';

import type { HouseholdMember } from '@domain/entities/household-member';
import type { Receipt } from '@domain/entities/receipt';
import type { ReceiptLineItem } from '@domain/entities/receipt-line-item';
import {
  byCategory,
  byMember,
  byStore,
  deltaPct,
  inMonth,
  keyAt,
  monthBuckets,
  monthKey,
  monthLabel,
  scannedBy,
  windowBounds,
} from '@domain/use-cases/spending/aggregate';

const NOW = new Date('2026-06-10T08:00:00.000Z');

function makeReceipt(overrides: Partial<Receipt>): Receipt {
  return {
    id: 'r1',
    householdId: 'hh1',
    scannedByUserId: 'user-a',
    storeName: 'Aldi',
    totalAmount: 10,
    taxAmount: null,
    purchasedAt: '2026-06-05T00:00:00.000Z',
    ocrStatus: 'succeeded',
    ocrConfidence: null,
    reconciledAt: null,
    createdAt: '2026-06-05T10:00:00.000Z',
    ...overrides,
  };
}

function makeLine(overrides: Partial<ReceiptLineItem>): ReceiptLineItem {
  return {
    id: 'l1',
    receiptId: 'r1',
    householdId: 'hh1',
    rawText: 'MILK',
    canonicalName: 'milk',
    category: 'dairy',
    quantity: 1,
    unit: 'unit',
    unitPrice: 2,
    lineTotal: 2,
    pantryItemId: null,
    ...overrides,
  };
}

const MEMBERS: HouseholdMember[] = [
  { userId: 'user-a', role: 'owner' },
  { userId: 'user-b', role: 'member' },
];

describe('monthKey', () => {
  it('buckets midnight-utc firsts into the printed month', () => {
    expect(monthKey('2026-06-01T00:00:00.000Z')).toBe('2026-06');
    expect(monthKey('2026-05-31T23:59:59.000Z')).toBe('2026-05');
  });

  it('crosses year boundaries', () => {
    expect(monthKey('2026-01-01T00:00:00.000Z')).toBe('2026-01');
    expect(keyAt(new Date('2026-01-15T00:00:00.000Z'), 1)).toBe('2025-12');
  });

  it('buckets by utc even when local time is the next month', () => {
    // / utc not local
    expect(monthKey('2026-06-30T18:30:00.000Z')).toBe('2026-06');
  });
});

describe('monthLabel', () => {
  it('maps keys to short names', () => {
    expect(monthLabel('2026-06')).toBe('Jun');
    expect(monthLabel('2025-12')).toBe('Dec');
  });
});

describe('windowBounds', () => {
  it('spans first of window to first of next month', () => {
    const bounds = windowBounds(NOW, 5);
    expect(bounds.fromIso).toBe('2026-01-01T00:00:00.000Z');
    expect(bounds.toIso).toBe('2026-07-01T00:00:00.000Z');
  });
});

describe('monthBuckets', () => {
  it('returns oldest-first with empty months at zero', () => {
    const receipts = [
      makeReceipt({ purchasedAt: '2026-06-01T00:00:00.000Z', totalAmount: 30 }),
      makeReceipt({ id: 'r2', purchasedAt: '2026-06-20T00:00:00.000Z', totalAmount: 12.5 }),
      makeReceipt({ id: 'r3', purchasedAt: '2026-03-04T00:00:00.000Z', totalAmount: 8 }),
    ];
    const buckets = monthBuckets(receipts, 5, NOW);
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
    ]);
    expect(buckets[2]?.total).toBe(8);
    expect(buckets[3]?.total).toBe(0);
    expect(buckets[5]?.total).toBe(42.5);
    expect(buckets[5]?.current).toBe(true);
    expect(buckets[4]?.current).toBe(false);
  });

  it('drops receipts outside the window', () => {
    const receipts = [
      makeReceipt({ purchasedAt: '2025-11-30T00:00:00.000Z', totalAmount: 99 }),
      makeReceipt({ id: 'r2', purchasedAt: '2027-01-01T00:00:00.000Z', totalAmount: 99 }),
    ];
    const buckets = monthBuckets(receipts, 5, NOW);
    expect(buckets.every((bucket) => bucket.total === 0)).toBe(true);
  });
});

describe('inMonth + scannedBy', () => {
  it('filters by month key and scanner', () => {
    const receipts = [
      makeReceipt({}),
      makeReceipt({ id: 'r2', purchasedAt: '2026-05-05T00:00:00.000Z' }),
      makeReceipt({ id: 'r3', scannedByUserId: 'user-b' }),
    ];
    expect(inMonth(receipts, '2026-06').map((receipt) => receipt.id)).toEqual(['r1', 'r3']);
    expect(scannedBy(receipts, 'user-b').map((receipt) => receipt.id)).toEqual(['r3']);
  });
});

describe('byMember', () => {
  it('lists zero-spend members and sums to section spend', () => {
    const receipts = [makeReceipt({ totalAmount: 30 }), makeReceipt({ id: 'r2', totalAmount: 10 })];
    const rows = byMember(receipts, MEMBERS);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ userId: 'user-a', total: 40, receiptCount: 2, sharePct: 100 });
    expect(rows[1]).toMatchObject({ userId: 'user-b', total: 0, receiptCount: 0, sharePct: 0 });
  });

  it('folds unknown scanners into former rows', () => {
    const receipts = [
      makeReceipt({ totalAmount: 30 }),
      makeReceipt({ id: 'r2', scannedByUserId: 'user-gone', totalAmount: 10 }),
    ];
    const rows = byMember(receipts, MEMBERS);
    const former = rows.find((row) => row.former);
    expect(former).toMatchObject({ userId: 'user-gone', total: 10, sharePct: 25 });
    const sum = rows.reduce((total, row) => total + row.total, 0);
    expect(sum).toBe(40);
  });
});

describe('byStore', () => {
  it('ranks stores and averages per receipt', () => {
    const receipts = [
      makeReceipt({ totalAmount: 30 }),
      makeReceipt({ id: 'r2', totalAmount: 6 }),
      makeReceipt({ id: 'r3', storeName: 'Costco', totalAmount: 50 }),
      makeReceipt({ id: 'r4', storeName: null, totalAmount: 5 }),
    ];
    const stores = byStore(receipts);
    expect(stores.map((store) => store.name)).toEqual(['Costco', 'Aldi', 'Unknown store']);
    expect(stores[1]).toMatchObject({ total: 36, receiptCount: 2, average: 18 });
  });
});

describe('byCategory', () => {
  it('takes top slices and folds the rest into other', () => {
    const lines = [
      makeLine({ category: 'produce', lineTotal: 50 }),
      makeLine({ id: 'l2', category: 'meat', lineTotal: 40 }),
      makeLine({ id: 'l3', category: 'dairy', lineTotal: 30 }),
      makeLine({ id: 'l4', category: 'pantry', lineTotal: 20 }),
      makeLine({ id: 'l5', category: 'bakery', lineTotal: 10 }),
      makeLine({ id: 'l6', category: 'frozen', lineTotal: 5 }),
    ];
    const breakdown = byCategory(lines);
    expect(breakdown.slices.map((slice) => slice.name)).toEqual([
      'Produce',
      'Meat',
      'Dairy',
      'Pantry',
      'Other',
    ]);
    expect(breakdown.slices[4]?.total).toBe(15);
    expect(breakdown.itemizedTotal).toBe(155);
  });

  it('folds null, blank, and literal other before ranking', () => {
    const lines = [
      makeLine({ category: null, lineTotal: 10 }),
      makeLine({ id: 'l2', category: '  ', lineTotal: 5 }),
      makeLine({ id: 'l3', category: 'Other', lineTotal: 5 }),
      makeLine({ id: 'l4', category: 'produce', lineTotal: 1 }),
    ];
    const breakdown = byCategory(lines);
    expect(breakdown.slices.map((slice) => slice.name)).toEqual(['Produce', 'Other']);
    expect(breakdown.slices[1]?.total).toBe(20);
  });

  it('returns no slices for no lines', () => {
    const breakdown = byCategory([]);
    expect(breakdown.slices).toEqual([]);
    expect(breakdown.itemizedTotal).toBe(0);
  });
});

describe('deltaPct', () => {
  it('rounds the percent change', () => {
    expect(deltaPct(478, 502)).toBe(-5);
    expect(deltaPct(612, 540)).toBe(13);
  });

  it('returns null when prior month is empty', () => {
    expect(deltaPct(100, 0)).toBeNull();
  });
});
