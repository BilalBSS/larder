// / accept invite by token
import type { InviteRepository } from '@data/repositories/invite-repository';

export async function acceptInvite(repo: InviteRepository, token: string): Promise<string> {
  const trimmed = token.trim();
  if (trimmed === '') throw new Error('empty_invite_token');
  return repo.acceptInvite(trimmed);
}
