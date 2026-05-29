// / shopping list repository
import type { SupabaseClient } from '@supabase/supabase-js';

import { parseRow, rowToEntity } from '@data/dtos/shopping-list-item-dto';
import { normalizeName, type ShoppingListItem } from '@domain/entities/shopping-list-item';

export interface AddShoppingListItemInput {
  householdId: string;
  displayName: string;
  addedByUserId: string;
  ownerUserId?: string | null;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
}

export interface ShoppingListRepository {
  list(householdId: string): Promise<ShoppingListItem[]>;
  add(input: AddShoppingListItemInput): Promise<void>;
  setChecked(input: {
    id: string;
    householdId: string;
    userId: string;
    checked: boolean;
  }): Promise<void>;
  remove(input: { id: string; householdId: string }): Promise<void>;
}

export interface ShoppingListRepositoryDeps {
  readonly supabase: Pick<SupabaseClient, 'from'>;
}

export function makeShoppingListRepository(
  deps: ShoppingListRepositoryDeps,
): ShoppingListRepository {
  return {
    async list(householdId) {
      const { data, error } = await deps.supabase
        .from('shopping_list_items')
        .select('*')
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .order('is_checked_off', { ascending: true })
        .order('created_at', { ascending: false });
      if (error !== null) throw error;
      const rows = (data ?? []) as unknown[];
      return rows.map((row) => rowToEntity(parseRow(row)));
    },

    async add(input) {
      const row = {
        household_id: input.householdId,
        canonical_name: normalizeName(input.displayName),
        display_name: input.displayName,
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        category: input.category ?? null,
        added_by_user_id: input.addedByUserId,
        owner_user_id: input.ownerUserId ?? null,
        is_auto_added: false,
      };
      const { error } = await deps.supabase.from('shopping_list_items').insert(row);
      if (error !== null) throw error;
    },

    async setChecked(input) {
      const patch = input.checked
        ? {
            is_checked_off: true,
            checked_off_at: new Date().toISOString(),
            checked_off_by_user_id: input.userId,
          }
        : { is_checked_off: false, checked_off_at: null, checked_off_by_user_id: null };
      const { error } = await deps.supabase
        .from('shopping_list_items')
        .update(patch)
        .eq('id', input.id)
        .eq('household_id', input.householdId);
      if (error !== null) throw error;
    },

    async remove(input) {
      const { error } = await deps.supabase
        .from('shopping_list_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('household_id', input.householdId);
      if (error !== null) throw error;
    },
  };
}
