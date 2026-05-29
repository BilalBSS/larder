// / household invite repository
import type { SupabaseClient } from '@supabase/supabase-js';

import { parseRow } from '@data/dtos/household-invite-dto';
import type { InviteRole } from '@domain/entities/household-invite';

export interface CreateInviteInput {
  householdId: string;
  role: InviteRole;
  invitedByUserId: string;
  expiresAt: string;
}

export interface CreateHouseholdInput {
  name: string;
  type: string;
}

export interface InviteRepository {
  createInvite(input: CreateInviteInput): Promise<string>;
  acceptInvite(token: string): Promise<string>;
  createHousehold(input: CreateHouseholdInput): Promise<string>;
}

export interface InviteRepositoryDeps {
  readonly supabase: Pick<SupabaseClient, 'rpc' | 'from'>;
}

export function makeInviteRepository(deps: InviteRepositoryDeps): InviteRepository {
  return {
    async createInvite(input) {
      const row = {
        household_id: input.householdId,
        role: input.role,
        invited_by_user_id: input.invitedByUserId,
        expires_at: input.expiresAt,
      };
      const { data, error } = await deps.supabase
        .from('household_invites')
        .insert(row)
        .select('*')
        .single();
      if (error !== null) throw error;
      return parseRow(data).token;
    },

    async acceptInvite(token) {
      const { data, error } = await deps.supabase.rpc('accept_invite', { p_token: token });
      if (error !== null) throw new Error(inviteErrorCode(error));
      const householdId = data as unknown;
      if (typeof householdId !== 'string') throw new Error('invite_accept_failed');
      return householdId;
    },

    async createHousehold(input) {
      const { data, error } = await deps.supabase.rpc('create_household_with_owner', {
        p_name: input.name,
        p_type: input.type,
      });
      if (error !== null) throw error;
      const householdId = data as unknown;
      if (typeof householdId !== 'string') throw new Error('household_create_failed');
      return householdId;
    },
  };
}

interface RpcError {
  readonly message?: string;
  readonly code?: string;
}

const KNOWN_CODES = ['invite_not_found', 'invite_expired', 'invite_already_accepted'] as const;

// / map rpc error
function inviteErrorCode(error: unknown): string {
  const { message = '', code } = error as RpcError;
  // / unique violation
  if (code === '23505' || message.includes('23505')) return 'invite_already_accepted';
  const known = KNOWN_CODES.find((known) => message.includes(known));
  return known ?? 'invite_accept_failed';
}
