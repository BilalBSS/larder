// / tier entitlements map

export type Tier =
  | 'free'
  | 'solo_monthly'
  | 'solo_yearly'
  | 'household_monthly'
  | 'household_yearly';

export type Cap = number | 'unlimited';

export interface Entitlements {
  readonly pantry_item_cap: Cap;
  readonly receipts_per_month: Cap;
  readonly recipes_per_day: Cap;
  readonly receipt_archive_days: Cap;
  readonly spending_dashboard: boolean;
  readonly meal_plan_multi_week: boolean;
  readonly recipe_customization: boolean;
  readonly creative_recipes: boolean;
  readonly priority_push: boolean;
  readonly oauth_inbox: boolean;
  readonly multi_user_household: boolean;
  readonly multi_household_linking: boolean;
  readonly settle_up: boolean;
  readonly per_user_attribution: boolean;
  readonly realtime_coedit: boolean;
  readonly bank_file_upload: boolean;
}

const FREE: Entitlements = {
  pantry_item_cap: 50,
  receipts_per_month: 8,
  recipes_per_day: 10,
  receipt_archive_days: 30,
  spending_dashboard: false,
  meal_plan_multi_week: false,
  recipe_customization: false,
  creative_recipes: false,
  priority_push: false,
  oauth_inbox: false,
  multi_user_household: false,
  multi_household_linking: false,
  settle_up: false,
  per_user_attribution: false,
  realtime_coedit: false,
  bank_file_upload: false,
};

const SOLO: Entitlements = {
  pantry_item_cap: 'unlimited',
  receipts_per_month: 'unlimited',
  recipes_per_day: 'unlimited',
  receipt_archive_days: 'unlimited',
  spending_dashboard: true,
  meal_plan_multi_week: true,
  recipe_customization: true,
  creative_recipes: true,
  priority_push: true,
  oauth_inbox: true,
  multi_user_household: false,
  multi_household_linking: false,
  settle_up: false,
  per_user_attribution: false,
  realtime_coedit: false,
  bank_file_upload: false,
};

const HOUSEHOLD: Entitlements = {
  ...SOLO,
  multi_user_household: true,
  multi_household_linking: true,
  settle_up: true,
  per_user_attribution: true,
  realtime_coedit: true,
  bank_file_upload: true,
};

export const ENTITLEMENTS: Readonly<Record<Tier, Entitlements>> = {
  free: FREE,
  solo_monthly: SOLO,
  solo_yearly: SOLO,
  household_monthly: HOUSEHOLD,
  household_yearly: HOUSEHOLD,
};

export function withinCap(usage: number, cap: Cap): boolean {
  return cap === 'unlimited' || usage < cap;
}

export function isPaid(tier: Tier): boolean {
  return tier !== 'free';
}

export function isHouseholdTier(tier: Tier): boolean {
  return tier === 'household_monthly' || tier === 'household_yearly';
}
