import { describe, expect, it } from 'vitest';

import type { HouseholdMember } from '@domain/entities/household-member';
import type { Receipt } from '@domain/entities/receipt';
import type { ReceiptLineItem } from '@domain/entities/receipt-line-item';
import type { DashboardData } from '@domain/use-cases/spending/get-dashboard';
import {
  buildSpendingViewModel,
  defaultScope,
  memberLabel,
  proseAmount,
} from '@domain/use-cases/spending/view-model';

const NOW = new Date('2026-06-10T08:00:00.000Z');
const SELF = 'u-self';
const OTHER = 'u-other';

function receipt(overrides: Partial<Receipt>): Receipt {
  return {
    id: 'r-1',
    householdId: 'h-1',
    scannedByUserId: SELF,
    storeName: 'Aldi',
    totalAmount: 40,
    taxAmount: null,
    purchasedAt: '2026-06-02T00:00:00.000Z',
    ocrStatus: 'succeeded',
    ocrConfidence: null,
    reconciledAt: null,
    createdAt: '2026-06-02T10:00:00.000Z',
    ...overrides,
  };
}

function line(overrides: Partial<ReceiptLineItem>): ReceiptLineItem {
  return {
    id: 'l-1',
    receiptId: 'r-1',
    householdId: 'h-1',
    rawText: 'MILK',
    canonicalName: 'milk',
    category: 'dairy',
    quantity: 1,
    unit: 'each',
    unitPrice: 2,
    lineTotal: 2,
    pantryItemId: null,
    ...overrides,
  };
}

const COUPLE: HouseholdMember[] = [
  { userId: SELF, role: 'owner' },
  { userId: OTHER, role: 'member' },
];

function data(overrides: Partial<DashboardData>): DashboardData {
  return {
    window: [],
    currentMonthLines: [],
    recent: [],
    budgets: { household: null, personal: null },
    members: COUPLE,
    householdType: 'couple',
    now: NOW,
    ...overrides,
  };
}

describe('buildSpendingViewModel hero', () => {
  it('scopes the hero and labels the delta', () => {
    const window = [
      receipt({ totalAmount: 40 }),
      receipt({ id: 'r-2', scannedByUserId: OTHER, totalAmount: 20 }),
      receipt({
        id: 'r-3',
        scannedByUserId: OTHER,
        purchasedAt: '2026-05-05T00:00:00.000Z',
        totalAmount: 50,
      }),
    ];
    const household = buildSpendingViewModel(data({ window }), 'household', SELF, '£');
    expect(household.hero.eyebrow).toBe('Jun household total');
    expect(household.hero.total).toBe(60);
    expect(household.hero.deltaLabel).toBe('20% vs May');
    expect(household.topEyebrow).toBe('Jun · 2 receipts · 2 cooks');

    expect(household.hero.deltaSpoken).toBe('Up 20 percent versus May');

    const mine = buildSpendingViewModel(data({ window }), 'mine', SELF, '£');
    expect(mine.hero.eyebrow).toBe('Jun · you');
    expect(mine.hero.total).toBe(40);
    expect(mine.hero.deltaLabel).toBeNull();
    expect(mine.hero.deltaSpoken).toBeNull();
  });

  it('suppresses cooks when the month is empty', () => {
    const vm = buildSpendingViewModel(data({}), 'household', SELF, '£');
    expect(vm.topEyebrow).toBe('Jun · 0 receipts');
  });

  it('builds the budget meter per scope', () => {
    const budgets = {
      household: {
        id: 'b-1',
        householdId: 'h-1',
        userId: null,
        scope: 'household' as const,
        category: null,
        monthlyLimit: 100,
        alertThresholdPct: 80,
      },
      personal: {
        id: 'b-2',
        householdId: 'h-1',
        userId: SELF,
        scope: 'personal' as const,
        category: null,
        monthlyLimit: 30,
        alertThresholdPct: 80,
      },
    };
    const window = [receipt({ totalAmount: 40 })];
    const household = buildSpendingViewModel(data({ window, budgets }), 'household', SELF, '£');
    expect(household.hero.budget).toEqual({ limit: 100, spent: 40, remaining: 60, over: 0 });
    const mine = buildSpendingViewModel(data({ window, budgets }), 'mine', SELF, '£');
    expect(mine.hero.budget).toEqual({ limit: 30, spent: 40, remaining: 0, over: 10 });
  });

  it('notes pending scans when no spend exists yet', () => {
    const vm = buildSpendingViewModel(
      data({ recent: [receipt({ ocrStatus: 'pending', totalAmount: 0 })] }),
      'household',
      SELF,
      '£',
    );
    expect(vm.hero.pendingNote).toBe(true);
    expect(vm.noReceipts).toBe(false);
  });
});

describe('buildSpendingViewModel members', () => {
  it('keeps member math household-wide in mine scope', () => {
    const window = [
      receipt({ totalAmount: 60 }),
      receipt({ id: 'r-2', scannedByUserId: OTHER, totalAmount: 20 }),
    ];
    const vm = buildSpendingViewModel(data({ window }), 'mine', SELF, '£');
    expect(vm.members.visible).toBe(true);
    expect(vm.members.rows).toHaveLength(2);
    expect(vm.members.footer).toBe("You're owed £20 to even out Jun.");
    expect(vm.members.pillAmount).toBe(20);
  });

  it('labels members by household type with you first person', () => {
    const window = [
      receipt({ totalAmount: 60 }),
      receipt({ id: 'r-2', scannedByUserId: OTHER, totalAmount: 20 }),
    ];
    const vm = buildSpendingViewModel(data({ window }), 'household', SELF, '£');
    expect(vm.members.rows.map((row) => row.label)).toEqual(['You', 'Partner']);
  });

  it('threads a departed scanner into a former-member row', () => {
    const window = [
      receipt({ totalAmount: 60 }),
      receipt({ id: 'r-2', scannedByUserId: 'u-gone', totalAmount: 20 }),
    ];
    const vm = buildSpendingViewModel(data({ window }), 'household', SELF, '£');
    const former = vm.members.rows.find((row) => row.userId === 'u-gone');
    expect(former?.label).toBe('Former member');
    expect(former?.total).toBe(20);
  });

  it('reads even when the month splits cleanly', () => {
    const window = [
      receipt({ totalAmount: 40 }),
      receipt({ id: 'r-2', scannedByUserId: OTHER, totalAmount: 40 }),
    ];
    const vm = buildSpendingViewModel(data({ window }), 'household', SELF, '£');
    expect(vm.members.footer).toBe("You're even this month.");
    expect(vm.members.pillAmount).toBeNull();
    expect(vm.members.settles).toEqual([]);
  });

  it('rolls the prior month forward when the new month is quiet', () => {
    const window = [receipt({ purchasedAt: '2026-05-20T00:00:00.000Z', totalAmount: 42 })];
    const vm = buildSpendingViewModel(data({ window }), 'household', SELF, '£');
    expect(vm.members.visible).toBe(true);
    expect(vm.members.rows).toEqual([]);
    expect(vm.members.footer).toBe("You're owed £21 to even out May.");
    expect(vm.members.pillAmount).toBe(21);
    expect(vm.members.settles).toEqual([expect.objectContaining({ monthLabel: 'May' })]);
  });

  it('falls back to the split prompt when self is settled', () => {
    const members: HouseholdMember[] = [...COUPLE, { userId: 'u-third', role: 'member' }];
    const window = [
      receipt({ totalAmount: 30 }),
      receipt({ id: 'r-2', scannedByUserId: OTHER, totalAmount: 60 }),
    ];
    const vm = buildSpendingViewModel(
      data({ window, members, householdType: 'shared' }),
      'household',
      SELF,
      '£',
    );
    expect(vm.members.footer).toBe('Tap settle up for the split.');
  });

  it('hides the section for solo households', () => {
    const vm = buildSpendingViewModel(
      data({ window: [receipt({})], members: [{ userId: SELF, role: 'owner' }] }),
      'household',
      SELF,
      '£',
    );
    expect(vm.members.visible).toBe(false);
  });
});

describe('buildSpendingViewModel sections', () => {
  it('filters lines and stores to the mine scope', () => {
    const window = [
      receipt({ totalAmount: 40 }),
      receipt({ id: 'r-2', scannedByUserId: OTHER, storeName: 'Costco', totalAmount: 20 }),
    ];
    const lines = [
      line({ lineTotal: 5 }),
      line({ id: 'l-2', receiptId: 'r-2', category: 'produce', lineTotal: 9 }),
    ];
    const vm = buildSpendingViewModel(
      data({ window, currentMonthLines: lines }),
      'mine',
      SELF,
      '£',
    );
    expect(vm.categories.breakdown.itemizedTotal).toBe(5);
    expect(vm.stores.rows.map((store) => store.name)).toEqual(['Aldi']);
  });

  it('hides empty sections and flags the empty dashboard', () => {
    const vm = buildSpendingViewModel(data({}), 'household', SELF, '£');
    expect(vm.trend.visible).toBe(false);
    expect(vm.categories.visible).toBe(false);
    expect(vm.stores.visible).toBe(false);
    expect(vm.noReceipts).toBe(true);
  });
});

describe('memberLabel + defaultScope + proseAmount', () => {
  it('maps labels by household type', () => {
    expect(memberLabel(SELF, SELF, 'roommates')).toBe('You');
    expect(memberLabel(OTHER, SELF, 'couple')).toBe('Partner');
    expect(memberLabel(OTHER, SELF, 'family')).toBe('Family member');
    expect(memberLabel(OTHER, SELF, 'shared')).toBe('Housemate');
    expect(memberLabel(OTHER, SELF, 'couple', true)).toBe('Former member');
  });

  it('defaults scope by household type', () => {
    expect(defaultScope('roommates')).toBe('mine');
    expect(defaultScope('shared')).toBe('mine');
    expect(defaultScope('couple')).toBe('household');
    expect(defaultScope('family')).toBe('household');
  });

  it('trims whole prose amounts only', () => {
    expect(proseAmount('£', 42)).toBe('£42');
    expect(proseAmount('£', 33.34)).toBe('£33.34');
  });
});
