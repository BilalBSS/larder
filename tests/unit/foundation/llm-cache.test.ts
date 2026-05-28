import { describe, expect, it } from 'vitest';

import { computeCacheKey, shouldInvalidate, type PantryFingerprint } from '@foundation/llm/cache';

const BASE: PantryFingerprint = {
  household_id: 'h-1',
  item_count: 42,
  last_modified_at: '2026-05-10T10:00:00.000Z',
  canonical_version: 1,
};

describe('computeCacheKey', () => {
  it('produces a stable string for stable input', () => {
    expect(computeCacheKey(BASE)).toBe(computeCacheKey({ ...BASE }));
  });

  it('changes when household changes', () => {
    expect(computeCacheKey(BASE)).not.toBe(computeCacheKey({ ...BASE, household_id: 'h-2' }));
  });

  it('changes when item count changes', () => {
    expect(computeCacheKey(BASE)).not.toBe(computeCacheKey({ ...BASE, item_count: 43 }));
  });

  it('changes when last_modified_at changes', () => {
    expect(computeCacheKey(BASE)).not.toBe(
      computeCacheKey({ ...BASE, last_modified_at: '2026-05-11T10:00:00.000Z' }),
    );
  });

  it('changes when canonical version bumps', () => {
    expect(computeCacheKey(BASE)).not.toBe(computeCacheKey({ ...BASE, canonical_version: 2 }));
  });
});

describe('shouldInvalidate', () => {
  it('returns false when fingerprints match', () => {
    expect(shouldInvalidate(BASE, { ...BASE })).toBe(false);
  });

  it('returns true on any field delta', () => {
    expect(shouldInvalidate(BASE, { ...BASE, item_count: 43 })).toBe(true);
    expect(shouldInvalidate(BASE, { ...BASE, household_id: 'h-2' })).toBe(true);
  });
});
