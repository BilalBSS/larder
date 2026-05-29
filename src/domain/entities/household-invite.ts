// / household invite value object
export type InviteRole = 'member' | 'child';

export interface HouseholdInvite {
  id: string;
  householdId: string;
  role: InviteRole;
  token: string;
  invitedByUserId: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  createdAt: string;
}

// / invite deep link
export function buildInviteUrl(token: string): string {
  return `larder://join/${token}`;
}
