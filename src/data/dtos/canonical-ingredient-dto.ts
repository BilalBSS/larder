// / canonical ingredient lookup dto
import { z } from 'zod';

export interface CanonicalMatch {
  canonicalName: string;
  category: string;
  defaultExpirationDays: number | null;
}

export const CanonicalIngredientRowSchema = z.object({
  canonical_name: z.string(),
  category: z.string(),
  default_expiration_days: z.number().nullable(),
});

export type CanonicalIngredientRow = z.infer<typeof CanonicalIngredientRowSchema>;

export function rowToMatch(row: CanonicalIngredientRow): CanonicalMatch {
  return {
    canonicalName: row.canonical_name,
    category: row.category,
    defaultExpirationDays: row.default_expiration_days,
  };
}

export function parseRow(raw: unknown): CanonicalIngredientRow {
  return CanonicalIngredientRowSchema.parse(raw);
}
