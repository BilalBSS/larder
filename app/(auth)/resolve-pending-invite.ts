// / wire pending invite resolver
import type { ResolvePendingInvite } from '@foundation/context';
import { inviteService, type InviteService } from '@domain/use-cases/invite/service';

import { clearPendingInvite, getPendingInvite } from './pending-invite';

export interface PendingInviteDeps {
  readonly accept: InviteService['accept'];
  readonly getToken: () => Promise<string | null>;
  readonly clearToken: () => Promise<void>;
}

export function makeResolvePendingInvite(deps: PendingInviteDeps): ResolvePendingInvite {
  return async () => {
    const token = await deps.getToken();
    if (token === null) return;
    await deps.accept(token);
    await deps.clearToken();
  };
}

export const resolvePendingInvite: ResolvePendingInvite = makeResolvePendingInvite({
  accept: (token) => inviteService.accept(token),
  getToken: getPendingInvite,
  clearToken: clearPendingInvite,
});
