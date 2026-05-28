// / pantry context cache key

export interface PantryFingerprint {
  readonly household_id: string;
  readonly item_count: number;
  readonly last_modified_at: string;
  readonly canonical_version: number;
}

export function computeCacheKey(fp: PantryFingerprint): string {
  return ['pantry', fp.household_id, fp.item_count, fp.last_modified_at, fp.canonical_version].join(
    ':',
  );
}

export function shouldInvalidate(prev: PantryFingerprint, next: PantryFingerprint): boolean {
  return computeCacheKey(prev) !== computeCacheKey(next);
}
