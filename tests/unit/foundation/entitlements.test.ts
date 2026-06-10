import { describe, expect, it } from 'vitest';

import {
  ENTITLEMENTS,
  isHouseholdTier,
  isPaid,
  withinCap,
  type Tier,
} from '@foundation/billing/entitlements';

const TIERS: readonly Tier[] = [
  'free',
  'solo_monthly',
  'solo_yearly',
  'household_monthly',
  'household_yearly',
];

describe('ENTITLEMENTS', () => {
  it('covers every tier in the schema enum', () => {
    for (const tier of TIERS) {
      expect(ENTITLEMENTS[tier]).toBeDefined();
    }
  });

  it('free has restrictive caps but the full spending surface', () => {
    const free = ENTITLEMENTS.free;
    expect(free.pantry_item_cap).toBe(50);
    expect(free.receipts_per_month).toBe(8);
    expect(free.recipes_per_day).toBe(10);
    expect(free.receipt_archive_days).toBe(30);
    expect(free.spending_dashboard).toBe(true);
    expect(free.settle_up).toBe(true);
    expect(free.per_user_attribution).toBe(true);
    expect(free.creative_recipes).toBe(false);
    expect(free.multi_user_household).toBe(false);
  });

  it('solo unlocks personal premium but not household features', () => {
    for (const tier of ['solo_monthly', 'solo_yearly'] as const) {
      const e = ENTITLEMENTS[tier];
      expect(e.pantry_item_cap).toBe('unlimited');
      expect(e.spending_dashboard).toBe(true);
      expect(e.creative_recipes).toBe(true);
      expect(e.oauth_inbox).toBe(true);
      expect(e.multi_user_household).toBe(false);
      expect(e.realtime_coedit).toBe(false);
    }
  });

  it('household unlocks everything solo has plus shared features', () => {
    for (const tier of ['household_monthly', 'household_yearly'] as const) {
      const e = ENTITLEMENTS[tier];
      expect(e.spending_dashboard).toBe(true);
      expect(e.multi_user_household).toBe(true);
      expect(e.multi_household_linking).toBe(true);
      expect(e.settle_up).toBe(true);
      expect(e.per_user_attribution).toBe(true);
      expect(e.realtime_coedit).toBe(true);
      expect(e.bank_file_upload).toBe(true);
    }
  });

  it('monthly and yearly match within a tier family', () => {
    expect(ENTITLEMENTS.solo_monthly).toEqual(ENTITLEMENTS.solo_yearly);
    expect(ENTITLEMENTS.household_monthly).toEqual(ENTITLEMENTS.household_yearly);
  });
});

describe('withinCap', () => {
  it('returns true for unlimited regardless of usage', () => {
    expect(withinCap(0, 'unlimited')).toBe(true);
    expect(withinCap(1_000_000, 'unlimited')).toBe(true);
  });

  it('returns true when usage is below cap', () => {
    expect(withinCap(49, 50)).toBe(true);
  });

  it('returns false when usage meets or exceeds cap', () => {
    expect(withinCap(50, 50)).toBe(false);
    expect(withinCap(51, 50)).toBe(false);
  });
});

describe('isPaid', () => {
  it('flags every non-free tier as paid', () => {
    expect(isPaid('free')).toBe(false);
    expect(isPaid('solo_monthly')).toBe(true);
    expect(isPaid('solo_yearly')).toBe(true);
    expect(isPaid('household_monthly')).toBe(true);
    expect(isPaid('household_yearly')).toBe(true);
  });
});

describe('isHouseholdTier', () => {
  it('flags only household tiers', () => {
    expect(isHouseholdTier('free')).toBe(false);
    expect(isHouseholdTier('solo_monthly')).toBe(false);
    expect(isHouseholdTier('solo_yearly')).toBe(false);
    expect(isHouseholdTier('household_monthly')).toBe(true);
    expect(isHouseholdTier('household_yearly')).toBe(true);
  });
});
