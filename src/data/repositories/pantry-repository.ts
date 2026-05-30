// / pantry repository
import type { SupabaseClient } from '@supabase/supabase-js';

import { parseRow, rowToEntity } from '@data/dtos/pantry-item-dto';
import { normalizeName } from '@domain/entities/normalize';
import type { PantryItem } from '@domain/entities/pantry-item';

export interface AddPantryItemInput {
  householdId: string;
  userId: string;
  displayName: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedExpirationDays?: number | null;
  expirationDate?: string | null;
  lastPurchasedAt?: string | null;
  lastUnitCost?: number | null;
  notes?: string | null;
  isFrozen?: boolean;
}

export interface RemovePantryItemInput {
  id: string;
  householdId: string;
  userId: string;
}

export interface PantryRepository {
  list(householdId: string): Promise<PantryItem[]>;
  count(householdId: string): Promise<number>;
  add(input: AddPantryItemInput): Promise<void>;
  remove(input: RemovePantryItemInput): Promise<void>;
}

export interface PantryRepositoryDeps {
  readonly supabase: Pick<SupabaseClient, 'from'>;
}

export function makePantryRepository(deps: PantryRepositoryDeps): PantryRepository {
  return {
    async list(householdId) {
      const { data, error } = await deps.supabase
        .from('pantry_items')
        .select('*')
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .order('expiration_date', { ascending: true, nullsFirst: false })
        .order('canonical_name', { ascending: true });
      if (error !== null) throw error;
      const rows = (data ?? []) as unknown[];
      return rows.map((row) => rowToEntity(parseRow(row)));
    },

    async count(householdId) {
      const { count, error } = await deps.supabase
        .from('pantry_items')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .is('deleted_at', null);
      if (error !== null) throw error;
      if (count === null) throw new Error('pantry_count_unavailable');
      return count;
    },

    async add(input) {
      const row = {
        household_id: input.householdId,
        canonical_name: normalizeName(input.displayName),
        display_name: input.displayName,
        category: input.category,
        quantity: input.quantity,
        unit: input.unit,
        expiration_date: input.expirationDate ?? null,
        estimated_expiration_days: input.estimatedExpirationDays ?? null,
        last_purchased_at: input.lastPurchasedAt ?? null,
        last_unit_cost: input.lastUnitCost ?? null,
        notes: input.notes ?? null,
        is_frozen: input.isFrozen ?? false,
        created_by_user_id: input.userId,
        updated_by_user_id: input.userId,
      };
      const { error } = await deps.supabase.from('pantry_items').insert(row);
      if (error !== null) throw error;
    },

    async remove(input) {
      const { error } = await deps.supabase
        .from('pantry_items')
        .update({ deleted_at: new Date().toISOString(), updated_by_user_id: input.userId })
        .eq('id', input.id)
        .eq('household_id', input.householdId);
      if (error !== null) throw error;
    },
  };
}
