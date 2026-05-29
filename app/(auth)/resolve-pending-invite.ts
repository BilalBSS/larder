// / wire pending invite resolver
import type { ResolvePendingInvite } from '@foundation/context';
import { inviteService, type InviteService } from '@domain/use-cases/invite/service';

import { clearPendingInvite, getPendingInvite } from './pending-invite';

export interface PendingInviteDeps {
  readonly accept: InviteService['accept'];
  readonly getToken: () => Promise<string | null>;
  readonly clearToken: () => Promise<void>;
}

// / terminal codes, never retry
const TERMINAL_CODES = new Set([
  'invite_expired',
  'invite_already_accepted',
  'invite_not_found',
  'empty_invite_token',
]);

export function makeResolvePendingInvite(deps: PendingInviteDeps): ResolvePendingInvite {
  return async () => {
    const token = await deps.getToken();
    if (token === null) return;
    try {
      await deps.accept(token);
    } catch (error: unknown) {
      // / clear poison, keep transient
      if (TERMINAL_CODES.has(errorCode(error))) await deps.clearToken();
      throw error;
    }
    await deps.clearToken();
  };
}

function errorCode(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export const resolvePendingInvite: ResolvePendingInvite = makeResolvePendingInvite({
  accept: (token) => inviteService.accept(token),
  getToken: getPendingInvite,
  clearToken: clearPendingInvite,
});
