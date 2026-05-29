import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { HouseholdInviteRow } from '@data/dtos/household-invite-dto';
import { makeInviteRepository } from '@data/repositories/invite-repository';

interface Result {
  readonly data: unknown;
  readonly error: unknown;
}

function row(overrides: Partial<HouseholdInviteRow> = {}): HouseholdInviteRow {
  return {
    id: 'inv-1',
    household_id: 'h-1',
    role: 'member',
    token: 'tok-1',
    invited_by_user_id: 'u-1',
    expires_at: '2026-06-05T00:00:00.000Z',
    accepted_at: null,
    accepted_by_user_id: null,
    created_at: '2026-05-29T00:00:00.000Z',
    ...overrides,
  };
}

function stubFrom(result: Result) {
  const calls = { insert: [] as unknown[] };
  const builder = {
    insert: (p: unknown) => {
      calls.insert.push(p);
      return builder;
    },
    select: () => builder,
    single: () => Promise.resolve(result),
  };
  return { from: () => builder, calls };
}

function stubRpc(result: Result) {
  const calls = { rpc: [] as { fn: string; args: unknown }[] };
  const rpc = (fn: string, args: unknown) => {
    calls.rpc.push({ fn, args });
    return Promise.resolve(result);
  };
  return { rpc, calls };
}

function makeSupabase(parts: {
  from?: ReturnType<typeof stubFrom>;
  rpc?: ReturnType<typeof stubRpc>;
}): Pick<SupabaseClient, 'rpc' | 'from'> {
  return {
    from: parts.from?.from ?? (() => undefined),
    rpc: parts.rpc?.rpc ?? (() => undefined),
  } as unknown as Pick<SupabaseClient, 'rpc' | 'from'>;
}

describe('inviteRepository.createInvite', () => {
  it('inserts a row and returns the token', async () => {
    const from = stubFrom({ data: row({ token: 'tok-xyz' }), error: null });
    const repo = makeInviteRepository({ supabase: makeSupabase({ from }) });
    const token = await repo.createInvite({
      householdId: 'h-1',
      role: 'member',
      invitedByUserId: 'u-1',
      expiresAt: '2026-06-05T00:00:00.000Z',
    });
    expect(token).toBe('tok-xyz');
    expect(from.calls.insert[0]).toMatchObject({
      household_id: 'h-1',
      role: 'member',
      invited_by_user_id: 'u-1',
      expires_at: '2026-06-05T00:00:00.000Z',
    });
  });

  it('throws when the insert errors', async () => {
    const from = stubFrom({ data: null, error: { message: 'boom' } });
    const repo = makeInviteRepository({ supabase: makeSupabase({ from }) });
    await expect(
      repo.createInvite({
        householdId: 'h-1',
        role: 'member',
        invitedByUserId: 'u-1',
        expiresAt: '2026-06-05T00:00:00.000Z',
      }),
    ).rejects.toEqual({ message: 'boom' });
  });
});

describe('inviteRepository.acceptInvite', () => {
  it('returns the household id from the rpc', async () => {
    const rpc = stubRpc({ data: 'h-9', error: null });
    const repo = makeInviteRepository({ supabase: makeSupabase({ rpc }) });
    expect(await repo.acceptInvite('tok-1')).toBe('h-9');
    expect(rpc.calls.rpc[0]).toEqual({ fn: 'accept_invite', args: { p_token: 'tok-1' } });
  });

  it('maps a known rpc exception to a typed error', async () => {
    const rpc = stubRpc({ data: null, error: { message: 'invite_expired' } });
    const repo = makeInviteRepository({ supabase: makeSupabase({ rpc }) });
    await expect(repo.acceptInvite('tok-1')).rejects.toThrow('invite_expired');
  });

  it('maps an unknown rpc exception to a generic error', async () => {
    const rpc = stubRpc({ data: null, error: { message: 'pgcode 23505 something' } });
    const repo = makeInviteRepository({ supabase: makeSupabase({ rpc }) });
    await expect(repo.acceptInvite('tok-1')).rejects.toThrow('invite_accept_failed');
  });

  it('throws when the rpc returns a non-string payload', async () => {
    const rpc = stubRpc({ data: null, error: null });
    const repo = makeInviteRepository({ supabase: makeSupabase({ rpc }) });
    await expect(repo.acceptInvite('tok-1')).rejects.toThrow('invite_accept_failed');
  });
});

describe('inviteRepository.createHousehold', () => {
  it('calls the rpc and returns the household id', async () => {
    const rpc = stubRpc({ data: 'h-new', error: null });
    const repo = makeInviteRepository({ supabase: makeSupabase({ rpc }) });
    expect(await repo.createHousehold({ name: 'Home', type: 'family' })).toBe('h-new');
    expect(rpc.calls.rpc[0]).toEqual({
      fn: 'create_household_with_owner',
      args: { p_name: 'Home', p_type: 'family' },
    });
  });

  it('throws when the rpc errors', async () => {
    const rpc = stubRpc({ data: null, error: { message: 'nope' } });
    const repo = makeInviteRepository({ supabase: makeSupabase({ rpc }) });
    await expect(repo.createHousehold({ name: 'Home', type: 'family' })).rejects.toEqual({
      message: 'nope',
    });
  });
});
