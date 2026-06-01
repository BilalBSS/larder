import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { makeCanonicalIngredientRepository } from '@data/repositories/canonical-ingredient-repository';

interface Result {
  readonly data: unknown;
  readonly error: unknown;
}

interface Calls {
  eq: unknown[][];
  contains: unknown[][];
  in: unknown[][];
}

function stubSupabase(queue: Result[]) {
  const calls: Calls = { eq: [], contains: [], in: [] };
  let index = 0;
  const builder = {
    select: () => builder,
    eq: (...args: unknown[]) => {
      calls.eq.push(args);
      return builder;
    },
    contains: (...args: unknown[]) => {
      calls.contains.push(args);
      return builder;
    },
    in: (...args: unknown[]) => {
      calls.in.push(args);
      return builder;
    },
    limit: () => builder,
    then: (resolve: (r: Result) => void) => resolve(queue[index++] ?? { data: [], error: null }),
  };
  const supabase = { from: () => builder } as unknown as Pick<SupabaseClient, 'from'>;
  return { supabase, calls };
}

describe('canonicalIngredientRepository.lookup', () => {
  it('returns an exact canonical-name match without a synonym query', async () => {
    const { supabase, calls } = stubSupabase([
      {
        data: [{ canonical_name: 'bananas', category: 'produce', default_expiration_days: 7 }],
        error: null,
      },
    ]);
    const repo = makeCanonicalIngredientRepository({ supabase });
    expect(await repo.lookup('Bananas')).toEqual({
      canonicalName: 'bananas',
      category: 'produce',
      defaultExpirationDays: 7,
    });
    expect(calls.eq).toContainEqual(['canonical_name', 'bananas']);
    expect(calls.contains).toHaveLength(0);
  });

  it('falls back to a synonym match', async () => {
    const { supabase, calls } = stubSupabase([
      { data: [], error: null },
      {
        data: [{ canonical_name: 'bananas', category: 'produce', default_expiration_days: 7 }],
        error: null,
      },
    ]);
    const repo = makeCanonicalIngredientRepository({ supabase });
    const match = await repo.lookup('banana');
    expect(match?.canonicalName).toBe('bananas');
    expect(calls.contains).toContainEqual(['synonyms', ['banana']]);
  });

  it('returns null when nothing matches', async () => {
    const { supabase } = stubSupabase([
      { data: [], error: null },
      { data: [], error: null },
    ]);
    const repo = makeCanonicalIngredientRepository({ supabase });
    expect(await repo.lookup('quux')).toBeNull();
  });

  it('preserves a null default expiration', async () => {
    const { supabase } = stubSupabase([
      {
        data: [{ canonical_name: 'cilantro', category: 'produce', default_expiration_days: null }],
        error: null,
      },
    ]);
    const repo = makeCanonicalIngredientRepository({ supabase });
    expect((await repo.lookup('cilantro'))?.defaultExpirationDays).toBeNull();
  });

  it('returns null for an empty name without querying', async () => {
    const { supabase, calls } = stubSupabase([]);
    const repo = makeCanonicalIngredientRepository({ supabase });
    expect(await repo.lookup('   ')).toBeNull();
    expect(calls.eq).toHaveLength(0);
  });

  it('throws when the query errors', async () => {
    const { supabase } = stubSupabase([{ data: null, error: { message: 'boom' } }]);
    const repo = makeCanonicalIngredientRepository({ supabase });
    await expect(repo.lookup('bananas')).rejects.toEqual({ message: 'boom' });
  });
});

describe('canonicalIngredientRepository.lookupMany', () => {
  it('batches a single query keyed by canonical name', async () => {
    const { supabase, calls } = stubSupabase([
      {
        data: [
          { canonical_name: 'milk', category: 'dairy', default_expiration_days: 7 },
          { canonical_name: 'eggs', category: 'dairy', default_expiration_days: 21 },
        ],
        error: null,
      },
    ]);
    const repo = makeCanonicalIngredientRepository({ supabase });
    const matches = await repo.lookupMany(['Milk', 'EGGS', 'unknown']);
    expect(calls.in).toContainEqual(['canonical_name', ['milk', 'eggs', 'unknown']]);
    expect(matches.get('milk')).toEqual({
      canonicalName: 'milk',
      category: 'dairy',
      defaultExpirationDays: 7,
    });
    expect(matches.get('eggs')?.category).toBe('dairy');
    expect(matches.has('unknown')).toBe(false);
  });

  it('returns an empty map without querying for blank names', async () => {
    const { supabase, calls } = stubSupabase([]);
    const repo = makeCanonicalIngredientRepository({ supabase });
    expect((await repo.lookupMany(['  ', ''])).size).toBe(0);
    expect(calls.in).toHaveLength(0);
  });

  it('throws when the batch query errors', async () => {
    const { supabase } = stubSupabase([{ data: null, error: { message: 'boom' } }]);
    const repo = makeCanonicalIngredientRepository({ supabase });
    await expect(repo.lookupMany(['milk'])).rejects.toEqual({ message: 'boom' });
  });
});
