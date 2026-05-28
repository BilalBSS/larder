// / household + tier reads
import type { SupabaseClient } from '@supabase/supabase-js';

import { ENTITLEMENTS, type Tier } from '@foundation/billing/entitlements';

export interface HouseholdRepository {
  activeHousehold(userId: string): Promise<string | null>;
  tier(userId: string): Promise<Tier>;
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
        .select('household_id, role, joined_at')
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
  };
}

function isTier(value: string): value is Tier {
  return value in ENTITLEMENTS;
}
