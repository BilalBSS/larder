// / canonical ingredient repository
import type { SupabaseClient } from '@supabase/supabase-js';

import { parseRow, rowToMatch, type CanonicalMatch } from '@data/dtos/canonical-ingredient-dto';
import { normalizeName } from '@domain/entities/normalize';

export interface CanonicalIngredientRepository {
  lookup(name: string): Promise<CanonicalMatch | null>;
  lookupMany(names: string[]): Promise<Map<string, CanonicalMatch>>;
}

export interface CanonicalIngredientRepositoryDeps {
  readonly supabase: Pick<SupabaseClient, 'from'>;
}

const COLUMNS = 'canonical_name, category, default_expiration_days';

export function makeCanonicalIngredientRepository(
  deps: CanonicalIngredientRepositoryDeps,
): CanonicalIngredientRepository {
  return {
    async lookup(name) {
      const normalized = normalizeName(name);
      if (normalized === '') return null;

      const exact = await deps.supabase
        .from('canonical_ingredients')
        .select(COLUMNS)
        .eq('canonical_name', normalized)
        .limit(1);
      if (exact.error !== null) throw exact.error;
      const exactRow = (exact.data ?? [])[0];
      if (exactRow !== undefined) return rowToMatch(parseRow(exactRow));

      const synonym = await deps.supabase
        .from('canonical_ingredients')
        .select(COLUMNS)
        .contains('synonyms', [normalized])
        .limit(1);
      if (synonym.error !== null) throw synonym.error;
      const synonymRow = (synonym.data ?? [])[0];
      if (synonymRow !== undefined) return rowToMatch(parseRow(synonymRow));

      return null;
    },

    async lookupMany(names) {
      const normalized = [...new Set(names.map(normalizeName).filter((name) => name !== ''))];
      if (normalized.length === 0) return new Map();
      const { data, error } = await deps.supabase
        .from('canonical_ingredients')
        .select(COLUMNS)
        .in('canonical_name', normalized);
      if (error !== null) throw error;
      const matches = new Map<string, CanonicalMatch>();
      for (const row of (data ?? []) as unknown[]) {
        const match = rowToMatch(parseRow(row));
        matches.set(match.canonicalName, match);
      }
      return matches;
    },
  };
}
