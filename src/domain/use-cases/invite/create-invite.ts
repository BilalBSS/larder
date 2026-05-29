// / create invite url
import type { CreateInviteInput, InviteRepository } from '@data/repositories/invite-repository';
import { buildInviteUrl, type InviteRole } from '@domain/entities/household-invite';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateInviteArgs {
  householdId: string;
  invitedByUserId: string;
  role?: InviteRole;
}

export interface CreatedInvite {
  readonly token: string;
  readonly url: string;
}

export async function createInvite(
  repo: InviteRepository,
  args: CreateInviteArgs,
): Promise<CreatedInvite> {
  const input: CreateInviteInput = {
    householdId: args.householdId,
    role: args.role ?? 'member',
    invitedByUserId: args.invitedByUserId,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  };
  const token = await repo.createInvite(input);
  return { token, url: buildInviteUrl(token) };
}
