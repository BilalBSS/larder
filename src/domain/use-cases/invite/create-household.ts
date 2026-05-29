// / create household owner
import type { InviteRepository } from '@data/repositories/invite-repository';

export interface CreateHouseholdArgs {
  name: string;
  type: string;
}

export async function createHousehold(
  repo: InviteRepository,
  args: CreateHouseholdArgs,
): Promise<string> {
  const name = args.name.trim();
  if (name === '') throw new Error('empty_household_name');
  return repo.createHousehold({ name, type: args.type });
}
