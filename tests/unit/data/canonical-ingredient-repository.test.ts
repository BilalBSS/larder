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
}

function stubSupabase(queue: Result[]) {
  const calls: Calls = { eq: [], contains: [] };
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
