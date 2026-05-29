import { describe, expect, it, vi } from 'vitest';

import type { InviteRepository } from '@data/repositories/invite-repository';
import { buildInviteUrl } from '@domain/entities/household-invite';
import { acceptInvite, createHousehold, createInvite } from '@domain/use-cases/invite';

function fakeRepo(overrides: Partial<InviteRepository> = {}): InviteRepository {
  return {
    createInvite: async () => 'tok-1',
    acceptInvite: async () => 'h-1',
    createHousehold: async () => 'h-1',
    ...overrides,
  };
}

describe('buildInviteUrl', () => {
  it('builds the deep link from a token', () => {
    expect(buildInviteUrl('abc-123')).toBe('larder://join/abc-123');
  });
});

describe('createInvite', () => {
  it('returns the token and its url', async () => {
    const grouped = await createInvite(fakeRepo({ createInvite: async () => 'tok-9' }), {
      householdId: 'h-1',
      invitedByUserId: 'u-1',
    });
    expect(grouped).toEqual({ token: 'tok-9', url: 'larder://join/tok-9' });
  });

  it('defaults the role to member and sets a future expiry', async () => {
    const createInviteFn = vi.fn<InviteRepository['createInvite']>(async () => 'tok-1');
    await createInvite(fakeRepo({ createInvite: createInviteFn }), {
      householdId: 'h-1',
      invitedByUserId: 'u-1',
    });
    const input = createInviteFn.mock.calls[0]?.[0];
    expect(input?.role).toBe('member');
    expect(Date.parse(input?.expiresAt ?? '')).toBeGreaterThan(Date.now());
  });

  it('forwards an explicit role', async () => {
    const createInviteFn = vi.fn<InviteRepository['createInvite']>(async () => 'tok-1');
    await createInvite(fakeRepo({ createInvite: createInviteFn }), {
      householdId: 'h-1',
      invitedByUserId: 'u-1',
      role: 'child',
    });
    expect(createInviteFn.mock.calls[0]?.[0]?.role).toBe('child');
  });
});

describe('acceptInvite', () => {
  it('returns the household id from the repo', async () => {
    expect(await acceptInvite(fakeRepo({ acceptInvite: async () => 'h-7' }), 'tok-1')).toBe('h-7');
  });

  it('trims the token before forwarding', async () => {
    const acceptInviteFn = vi.fn(async () => 'h-1');
    await acceptInvite(fakeRepo({ acceptInvite: acceptInviteFn }), '  tok-1  ');
    expect(acceptInviteFn).toHaveBeenCalledWith('tok-1');
  });

  it('throws on an empty token', async () => {
    await expect(acceptInvite(fakeRepo(), '   ')).rejects.toThrow('empty_invite_token');
  });

  it('propagates a mapped repo error', async () => {
    const repo = fakeRepo({
      acceptInvite: async () => {
        throw new Error('invite_expired');
      },
    });
    await expect(acceptInvite(repo, 'tok-1')).rejects.toThrow('invite_expired');
  });
});

describe('createHousehold', () => {
  it('trims the name and returns the household id', async () => {
    const createHouseholdFn = vi.fn(async () => 'h-new');
    const id = await createHousehold(fakeRepo({ createHousehold: createHouseholdFn }), {
      name: '  Home  ',
      type: 'family',
    });
    expect(id).toBe('h-new');
    expect(createHouseholdFn).toHaveBeenCalledWith({ name: 'Home', type: 'family' });
  });

  it('throws on an empty name', async () => {
    await expect(createHousehold(fakeRepo(), { name: '   ', type: 'family' })).rejects.toThrow(
      'empty_household_name',
    );
  });
});
