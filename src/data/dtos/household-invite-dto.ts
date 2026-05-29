// / household invite row dto
import { z } from 'zod';

import type { HouseholdInvite } from '@domain/entities/household-invite';

export const HouseholdInviteRowSchema = z.object({
  id: z.string(),
  household_id: z.string(),
  role: z.enum(['member', 'child']),
  token: z.string(),
  invited_by_user_id: z.string(),
  expires_at: z.string(),
  accepted_at: z.string().nullable(),
  accepted_by_user_id: z.string().nullable(),
  created_at: z.string(),
});

export type HouseholdInviteRow = z.infer<typeof HouseholdInviteRowSchema>;

export function rowToEntity(row: HouseholdInviteRow): HouseholdInvite {
  return {
    id: row.id,
    householdId: row.household_id,
    role: row.role,
    token: row.token,
    invitedByUserId: row.invited_by_user_id,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    acceptedByUserId: row.accepted_by_user_id,
    createdAt: row.created_at,
  };
}

export function parseRow(raw: unknown): HouseholdInviteRow {
  return HouseholdInviteRowSchema.parse(raw);
}
