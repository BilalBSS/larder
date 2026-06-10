// / household + tier reads
import type { SupabaseClient } from '@supabase/supabase-js';

import { ENTITLEMENTS, type Tier } from '@foundation/billing/entitlements';

export interface HouseholdRepository {
  activeHousehold(userId: string): Promise<string | null>;
  tier(userId: string): Promise<Tier>;
  currency(householdId: string): Promise<string>;
  setCurrency(householdId: string, code: string): Promise<void>;
}

export interface HouseholdRepositoryDeps {
  readonly supabase: Pick<SupabaseClient, 'from'>;
}

interface MemberRow {
  readonly household_id: string;
  readonly role: string;
}

export function makeHouseholdRepository(deps: HouseholdRepositoryDeps): HouseholdRepository {
  return {
    async activeHousehold(userId) {
      const { data, error } = await deps.supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('joined_at', { ascending: true });
      if (error !== null) throw error;
      const rows = (data ?? []) as unknown as MemberRow[];
      const first = rows[0];
      if (first === undefined) return null;
      const owner = rows.find((row) => row.role === 'owner');
      return (owner ?? first).household_id;
    },

    async tier(userId) {
      const { data, error } = await deps.supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', userId)
        .maybeSingle();
      if (error !== null || data === null) return 'free';
      const value = (data as unknown as { tier: string }).tier;
      return isTier(value) ? value : 'free';
    },

    async currency(householdId) {
      const { data, error } = await deps.supabase
        .from('households')
        .select('currency')
        .eq('id', householdId)
        .maybeSingle();
      if (error !== null || data === null) return 'GBP';
      return (data as unknown as { currency: string | null }).currency ?? 'GBP';
    },

    async setCurrency(householdId, code) {
      const { error } = await deps.supabase
        .from('households')
        .update({ currency: code })
        .eq('id', householdId);
      if (error !== null) throw error;
    },
  };
}

function isTier(value: string): value is Tier {
  return value in ENTITLEMENTS;
}
