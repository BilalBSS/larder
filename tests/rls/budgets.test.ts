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

runRls('budgets isolation', () => {
  it('member sets, updates, and hard-deletes own household budget', async () => {
    const client = anonClient(f.a.jwt);
    const inserted = await client
      .from('budgets')
      .insert({ household_id: f.a.household_id, scope: 'household', monthly_limit: 640 })
      .select('id')
      .single();
    expect(inserted.error).toBeNull();
    const id = (inserted.data as { id: string }).id;

    const updated = await client.from('budgets').update({ monthly_limit: 720 }).eq('id', id);
    expect(updated.error).toBeNull();

    const read = await client.from('budgets').select('monthly_limit').eq('id', id).maybeSingle();
    expect(read.error).toBeNull();
    expect((read.data as { monthly_limit: number }).monthly_limit).toBe(720);

    const removed = await client
      .from('budgets')
      .delete()
      .eq('household_id', f.a.household_id)
      .eq('scope', 'household')
      .is('user_id', null);
    expect(removed.error).toBeNull();

    const after = await client
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', f.a.household_id);
    expect(after.error).toBeNull();
    expect(after.count).toBe(0);
  });

  it('co-member reads another member personal budget by design', async () => {
    const admin = adminClient();
    const joined = await admin.from('household_members').insert({
      household_id: f.a.household_id,
      user_id: f.b.user_id,
      role: 'member',
    });
    expect(joined.error).toBeNull();

    const mine = await anonClient(f.a.jwt)
      .from('budgets')
      .insert({
        household_id: f.a.household_id,
        scope: 'personal',
        user_id: f.a.user_id,
        monthly_limit: 200,
      })
      .select('id')
      .single();
    expect(mine.error).toBeNull();

    const seen = await anonClient(f.b.jwt)
      .from('budgets')
      .select('user_id, monthly_limit')
      .eq('household_id', f.a.household_id)
      .eq('scope', 'personal');
    expect(seen.error).toBeNull();
    expect(seen.data).toEqual([{ user_id: f.a.user_id, monthly_limit: 200 }]);
  });

  it('outsider reads zero rows from another household', async () => {
    const admin = adminClient();
    const seeded = await admin
      .from('budgets')
      .insert({ household_id: f.b.household_id, scope: 'household', monthly_limit: 500 })
      .select('id')
      .single();
    expect(seeded.error).toBeNull();

    const res = await anonClient(f.a.jwt)
      .from('budgets')
      .select('id')
      .eq('household_id', f.b.household_id);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('outsider cannot insert into another household', async () => {
    const res = await anonClient(f.a.jwt)
      .from('budgets')
      .insert({ household_id: f.b.household_id, scope: 'household', monthly_limit: 100 });
    expect(res.error).not.toBeNull();
  });
});
