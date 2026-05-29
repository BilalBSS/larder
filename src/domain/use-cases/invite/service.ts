// / wired invite service
import {
  makeInviteRepository,
  type InviteRepositoryDeps,
} from '@data/repositories/invite-repository';
import { supabase } from '@foundation/auth/supabase';

import { acceptInvite } from './accept-invite';
import { createHousehold, type CreateHouseholdArgs } from './create-household';
import { createInvite, type CreatedInvite, type CreateInviteArgs } from './create-invite';

export interface InviteService {
  create(args: CreateInviteArgs): Promise<CreatedInvite>;
  accept(token: string): Promise<string>;
  createHousehold(args: CreateHouseholdArgs): Promise<string>;
}

export function makeInviteService(deps: InviteRepositoryDeps): InviteService {
  const repo = makeInviteRepository(deps);
  return {
    create: (args) => createInvite(repo, args),
    accept: (token) => acceptInvite(repo, token),
    createHousehold: (args) => createHousehold(repo, args),
  };
}

export const inviteService: InviteService = makeInviteService({ supabase });
