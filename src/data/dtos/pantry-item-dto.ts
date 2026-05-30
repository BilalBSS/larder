// / pantry item row dto
import { z } from 'zod';

import type { PantryItem } from '@domain/entities/pantry-item';

export const PantryItemRowSchema = z.object({
  id: z.string(),
  household_id: z.string(),
  canonical_name: z.string(),
  display_name: z.string(),
  category: z.string(),
  quantity: z.number(),
  unit: z.string(),
  expiration_date: z.string().nullable(),
  estimated_expiration_days: z.number().nullable(),
  last_purchased_at: z.string().nullable(),
  last_unit_cost: z.number().nullable(),
  notes: z.string().nullable(),
  is_frozen: z.boolean(),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by_user_id: z.string(),
  updated_by_user_id: z.string(),
  deleted_at: z.string().nullable(),
});

export type PantryItemRow = z.infer<typeof PantryItemRowSchema>;

export function rowToEntity(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    householdId: row.household_id,
    canonicalName: row.canonical_name,
    displayName: row.display_name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    expirationDate: row.expiration_date,
    estimatedExpirationDays: row.estimated_expiration_days,
    lastPurchasedAt: row.last_purchased_at,
    lastUnitCost: row.last_unit_cost,
    notes: row.notes,
    isFrozen: row.is_frozen,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parseRow(raw: unknown): PantryItemRow {
  return PantryItemRowSchema.parse(raw);
}
