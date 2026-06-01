import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adminClient, anonClient, rlsConfigured, setupFixture, type RlsFixture } from './setup';

const runRls = rlsConfigured() ? describe : describe.skip;

let f: RlsFixture;

beforeAll(async () => {
  if (!rlsConfigured()) return;
  f = await setupFixture();
}, 60_000);

afterAll(async () => {
  if (f !== undefined) await f.teardown();
});

runRls('pantry_items isolation', () => {
  it('user A reads own household pantry items', async () => {
    const res = await anonClient(f.a.jwt)
      .from('pantry_items')
      .select('id')
      .eq('household_id', f.a.household_id);
    expect(res.error).toBeNull();
    expect((res.data ?? []).length).toBeGreaterThan(0);
  });

  it('user A reads zero rows from user B household', async () => {
    const res = await anonClient(f.a.jwt)
      .from('pantry_items')
      .select('id')
      .eq('household_id', f.b.household_id);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('user A cannot insert pantry items into user B household', async () => {
    const res = await anonClient(f.a.jwt).from('pantry_items').insert({
      household_id: f.b.household_id,
      canonical_name: 'apple',
      display_name: 'Apples',
      category: 'produce',
      quantity: 3,
      unit: 'each',
      created_by_user_id: f.a.user_id,
      updated_by_user_id: f.a.user_id,
    });
    expect(res.error).not.toBeNull();
  });

  it('soft-deleted items are hidden from member reads', async () => {
    const admin = adminClient();
    const inserted = await admin
      .from('pantry_items')
      .insert({
        household_id: f.a.household_id,
        canonical_name: 'apples',
        display_name: 'Apples',
        category: 'produce',
        quantity: 4,
        unit: 'count',
        created_by_user_id: f.a.user_id,
        updated_by_user_id: f.a.user_id,
      })
      .select('id')
      .single();
    expect(inserted.error).toBeNull();
    const id = (inserted.data as { id: string }).id;

    const before = await anonClient(f.a.jwt)
      .from('pantry_items')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', f.a.household_id)
      .is('deleted_at', null);
    expect(before.error).toBeNull();

    const removed = await admin
      .from('pantry_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    expect(removed.error).toBeNull();

    const visible = await anonClient(f.a.jwt).from('pantry_items').select('id').eq('id', id);
    expect(visible.data).toEqual([]);

    const after = await anonClient(f.a.jwt)
      .from('pantry_items')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', f.a.household_id)
      .is('deleted_at', null);
    expect((before.count ?? 0) - (after.count ?? 0)).toBe(1);
  });

  it('user A cannot soft-delete an item in user B household', async () => {
    const admin = adminClient();
    const seeded = await admin
      .from('pantry_items')
      .select('id')
      .eq('household_id', f.b.household_id)
      .is('deleted_at', null)
      .limit(1)
      .single();
    const id = (seeded.data as { id: string }).id;
    await anonClient(f.a.jwt)
      .from('pantry_items')
      .update({ deleted_at: new Date().toISOString(), updated_by_user_id: f.a.user_id })
      .eq('id', id);
    const still = await admin.from('pantry_items').select('deleted_at').eq('id', id).single();
    expect((still.data as { deleted_at: string | null }).deleted_at).toBeNull();
  });
});

runRls('household_members isolation', () => {
  it('user A reads own membership row', async () => {
    const res = await anonClient(f.a.jwt)
      .from('household_members')
      .select('household_id')
      .eq('user_id', f.a.user_id);
    expect(res.error).toBeNull();
    expect((res.data ?? []).length).toBe(1);
  });

  it('user A cannot read user B household members', async () => {
    const res = await anonClient(f.a.jwt)
      .from('household_members')
      .select('household_id')
      .eq('household_id', f.b.household_id);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});

runRls('user_preferences self isolation', () => {
  it('user A writes own preferences', async () => {
    const res = await anonClient(f.a.jwt)
      .from('user_preferences')
      .upsert({ user_id: f.a.user_id, cuisines_liked: ['italian'] });
    expect(res.error).toBeNull();
  });

  it('user A cannot read user B preferences', async () => {
    await anonClient(f.b.jwt)
      .from('user_preferences')
      .upsert({ user_id: f.b.user_id, cuisines_liked: ['thai'] });
    const res = await anonClient(f.a.jwt)
      .from('user_preferences')
      .select('cuisines_liked')
      .eq('user_id', f.b.user_id);
    expect(res.data).toEqual([]);
  });

  it('user A cannot upsert user B preferences', async () => {
    const res = await anonClient(f.a.jwt)
      .from('user_preferences')
      .upsert({ user_id: f.b.user_id, cuisines_liked: ['hijacked'] });
    expect(res.error).not.toBeNull();
  });
});

runRls('recipe_interactions household read scope', () => {
  it('user A inserts own interaction', async () => {
    const res = await anonClient(f.a.jwt).from('recipe_interactions').insert({
      user_id: f.a.user_id,
      household_id: f.a.household_id,
      event_type: 'viewed',
    });
    expect(res.error).toBeNull();
  });

  it('user A cannot insert under another user_id', async () => {
    const res = await anonClient(f.a.jwt).from('recipe_interactions').insert({
      user_id: f.b.user_id,
      household_id: f.a.household_id,
      event_type: 'viewed',
    });
    expect(res.error).not.toBeNull();
  });

  it('user A cannot read user B household interactions', async () => {
    await anonClient(f.b.jwt).from('recipe_interactions').insert({
      user_id: f.b.user_id,
      household_id: f.b.household_id,
      event_type: 'viewed',
    });
    const res = await anonClient(f.a.jwt)
      .from('recipe_interactions')
      .select('id')
      .eq('household_id', f.b.household_id);
    expect(res.data).toEqual([]);
  });
});

runRls('shopping_list_items isolation', () => {
  it('user A adds an item to own household', async () => {
    const res = await anonClient(f.a.jwt).from('shopping_list_items').insert({
      household_id: f.a.household_id,
      canonical_name: 'milk',
      display_name: 'Milk',
      added_by_user_id: f.a.user_id,
    });
    expect(res.error).toBeNull();
  });

  it('user A reads own household items', async () => {
    const res = await anonClient(f.a.jwt)
      .from('shopping_list_items')
      .select('id')
      .eq('household_id', f.a.household_id);
    expect(res.error).toBeNull();
    expect((res.data ?? []).length).toBeGreaterThan(0);
  });

  it('user A reads zero rows from user B household', async () => {
    const res = await anonClient(f.a.jwt)
      .from('shopping_list_items')
      .select('id')
      .eq('household_id', f.b.household_id);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('user A cannot insert into user B household', async () => {
    const res = await anonClient(f.a.jwt).from('shopping_list_items').insert({
      household_id: f.b.household_id,
      canonical_name: 'eggs',
      display_name: 'Eggs',
      added_by_user_id: f.a.user_id,
    });
    expect(res.error).not.toBeNull();
  });
});

runRls('canonical_ingredients shared read', () => {
  it('any authenticated user can read', async () => {
    const res = await anonClient(f.a.jwt).from('canonical_ingredients').select('id').limit(1);
    expect(res.error).toBeNull();
  });

  it('authenticated user cannot insert canonical ingredients', async () => {
    const res = await anonClient(f.a.jwt).from('canonical_ingredients').insert({
      canonical_name: 'should-fail',
      category: 'produce',
    });
    expect(res.error).not.toBeNull();
  });
});
