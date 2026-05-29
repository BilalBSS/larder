import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  adminClient,
  anonClient,
  makeBareActor,
  rlsConfigured,
  setupFixture,
  type BareActorHandle,
  type RlsFixture,
} from './setup';

const runRls = rlsConfigured() ? describe : describe.skip;

let f: RlsFixture;
let invitee: BareActorHandle;

beforeAll(async () => {
  if (!rlsConfigured()) return;
  f = await setupFixture();
  invitee = await makeBareActor();
}, 60_000);

afterAll(async () => {
  if (invitee !== undefined) await invitee.teardown();
  if (f !== undefined) await f.teardown();
});

// / service_role seed
async function seedInvite(overrides: Record<string, unknown>): Promise<string> {
  const res = await adminClient()
    .from('household_invites')
    .insert({
      household_id: f.a.household_id,
      role: 'member',
      invited_by_user_id: f.a.user_id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    })
    .select('token')
    .single();
  if (res.error !== null || res.data === null) {
    throw new Error(`seed invite failed: ${res.error?.message ?? 'no row'}`);
  }
  return (res.data as { token: string }).token;
}

runRls('household_invites isolation', () => {
  it('member creates an invite for own household', async () => {
    const res = await anonClient(f.a.jwt)
      .from('household_invites')
      .insert({
        household_id: f.a.household_id,
        role: 'member',
        invited_by_user_id: f.a.user_id,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .select('token')
      .single();
    expect(res.error).toBeNull();
    expect(typeof (res.data as { token: string } | null)?.token).toBe('string');
  });

  it('member reads own household invites', async () => {
    const res = await anonClient(f.a.jwt)
      .from('household_invites')
      .select('id')
      .eq('household_id', f.a.household_id);
    expect(res.error).toBeNull();
    expect((res.data ?? []).length).toBeGreaterThan(0);
  });

  it('non-member cannot insert an invite for another household', async () => {
    const res = await anonClient(invitee.jwt)
      .from('household_invites')
      .insert({
        household_id: f.a.household_id,
        role: 'member',
        invited_by_user_id: invitee.user_id,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      });
    expect(res.error).not.toBeNull();
  });

  it('non-member reads zero invites for another household', async () => {
    const res = await anonClient(invitee.jwt)
      .from('household_invites')
      .select('id')
      .eq('household_id', f.a.household_id);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});

runRls('create_household_with_owner', () => {
  it('anon user creates a household and owner membership', async () => {
    const client = anonClient(invitee.jwt);
    const rpc = await client.rpc('create_household_with_owner', {
      p_name: 'Invitee Home',
      p_type: 'couple',
    });
    expect(rpc.error).toBeNull();
    const householdId = rpc.data as unknown;
    expect(typeof householdId).toBe('string');

    const household = await client
      .from('households')
      .select('id')
      .eq('id', householdId as string);
    expect(household.error).toBeNull();
    expect((household.data ?? []).length).toBe(1);

    const member = await client
      .from('household_members')
      .select('role')
      .eq('household_id', householdId as string)
      .eq('user_id', invitee.user_id);
    expect(member.error).toBeNull();
    expect((member.data as { role: string }[] | null)?.[0]?.role).toBe('owner');

    const owned = await client
      .from('households')
      .select('created_by_user_id')
      .eq('id', householdId as string)
      .single();
    expect((owned.data as { created_by_user_id: string } | null)?.created_by_user_id).toBe(
      invitee.user_id,
    );
  });

  it('rejects an invalid household type', async () => {
    const rpc = await anonClient(invitee.jwt).rpc('create_household_with_owner', {
      p_name: 'Bad',
      p_type: 'not_a_type',
    });
    expect(rpc.error).not.toBeNull();
  });
});

runRls('accept_invite', () => {
  it('rejects an unknown token', async () => {
    const rpc = await anonClient(invitee.jwt).rpc('accept_invite', {
      p_token: '00000000-0000-0000-0000-000000000000',
    });
    expect(rpc.error).not.toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await seedInvite({ expires_at: new Date(Date.now() - 1000).toISOString() });
    const rpc = await anonClient(invitee.jwt).rpc('accept_invite', { p_token: token });
    expect(rpc.error).not.toBeNull();
  });

  it('rejects an already-accepted token', async () => {
    const token = await seedInvite({
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: f.a.user_id,
    });
    const rpc = await anonClient(invitee.jwt).rpc('accept_invite', { p_token: token });
    expect(rpc.error).not.toBeNull();
  });

  it('makes a non-member a member and the household selectable', async () => {
    const joiner = await makeBareActor();
    try {
      const token = await seedInvite({});
      const client = anonClient(joiner.jwt);

      const before = await client.from('households').select('id').eq('id', f.a.household_id);
      expect(before.data).toEqual([]);

      const rpc = await client.rpc('accept_invite', { p_token: token });
      expect(rpc.error).toBeNull();
      expect(rpc.data as unknown).toBe(f.a.household_id);

      const member = await client
        .from('household_members')
        .select('role')
        .eq('household_id', f.a.household_id)
        .eq('user_id', joiner.user_id);
      expect((member.data as { role: string }[] | null)?.[0]?.role).toBe('member');

      const after = await client.from('households').select('id').eq('id', f.a.household_id);
      expect((after.data ?? []).length).toBe(1);
    } finally {
      await joiner.teardown();
    }
  });

  it('binds role and identity from the invite, not params', async () => {
    const joiner = await makeBareActor();
    try {
      const token = await seedInvite({ role: 'child' });
      const client = anonClient(joiner.jwt);

      const rpc = await client.rpc('accept_invite', { p_token: token });
      expect(rpc.error).toBeNull();

      const member = await client
        .from('household_members')
        .select('role')
        .eq('household_id', f.a.household_id)
        .eq('user_id', joiner.user_id)
        .single();
      expect((member.data as { role: string } | null)?.role).toBe('child');

      const invite = await adminClient()
        .from('household_invites')
        .select('accepted_by_user_id')
        .eq('token', token)
        .single();
      expect((invite.data as { accepted_by_user_id: string } | null)?.accepted_by_user_id).toBe(
        joiner.user_id,
      );
    } finally {
      await joiner.teardown();
    }
  });

  it('rejects a second join via the unique constraint', async () => {
    const joiner = await makeBareActor();
    try {
      const client = anonClient(joiner.jwt);

      const first = await client.rpc('accept_invite', { p_token: await seedInvite({}) });
      expect(first.error).toBeNull();

      const second = await client.rpc('accept_invite', { p_token: await seedInvite({}) });
      expect(second.error).not.toBeNull();
    } finally {
      await joiner.teardown();
    }
  });

  it('rejects an invite whose household was soft-deleted', async () => {
    const joiner = await makeBareActor();
    const admin = adminClient();
    const created = await admin
      .from('households')
      .insert({ name: 'Ghost', household_type: 'family', created_by_user_id: f.a.user_id })
      .select('id')
      .single();
    const ghostId = (created.data as { id: string }).id;
    try {
      const token = await seedInvite({ household_id: ghostId });
      await admin
        .from('households')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', ghostId);

      const rpc = await anonClient(joiner.jwt).rpc('accept_invite', { p_token: token });
      expect(rpc.error).not.toBeNull();
    } finally {
      await admin.from('households').delete().eq('id', ghostId);
      await joiner.teardown();
    }
  });
});

runRls('household_members self-insert is closed', () => {
  it('denies a direct insert into an arbitrary household', async () => {
    const res = await anonClient(invitee.jwt).from('household_members').insert({
      household_id: f.a.household_id,
      user_id: invitee.user_id,
      role: 'member',
    });
    expect(res.error).not.toBeNull();
  });

  it('denies self-insert even into a brand-new household id', async () => {
    const res = await anonClient(invitee.jwt).from('household_members').insert({
      household_id: '11111111-1111-1111-1111-111111111111',
      user_id: invitee.user_id,
      role: 'owner',
    });
    expect(res.error).not.toBeNull();
  });
});
