// / shopping list row dto
import { z } from 'zod';

import type { ShoppingListItem } from '@domain/entities/shopping-list-item';

export const ShoppingListItemRowSchema = z.object({
  id: z.string(),
  household_id: z.string(),
  canonical_name: z.string(),
  display_name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  category: z.string().nullable(),
  added_by_user_id: z.string(),
  owner_user_id: z.string().nullable(),
  is_auto_added: z.boolean(),
  is_checked_off: z.boolean(),
  checked_off_at: z.string().nullable(),
  checked_off_by_user_id: z.string().nullable(),
  version: z.number(),
  created_at: z.string(),
  deleted_at: z.string().nullable(),
});

export type ShoppingListItemRow = z.infer<typeof ShoppingListItemRowSchema>;

export function rowToEntity(row: ShoppingListItemRow): ShoppingListItem {
  return {
    id: row.id,
    householdId: row.household_id,
    canonicalName: row.canonical_name,
    displayName: row.display_name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    addedByUserId: row.added_by_user_id,
    ownerUserId: row.owner_user_id,
    isAutoAdded: row.is_auto_added,
    isCheckedOff: row.is_checked_off,
    checkedOffAt: row.checked_off_at,
    checkedOffByUserId: row.checked_off_by_user_id,
    createdAt: row.created_at,
  };
}

export function parseRow(raw: unknown): ShoppingListItemRow {
  return ShoppingListItemRowSchema.parse(raw);
}
