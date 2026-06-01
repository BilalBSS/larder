// / add validated pantry item
import type { AddPantryItemInput, PantryRepository } from '@data/repositories/pantry-repository';
import { withinCap, type Entitlements } from '@foundation/billing/entitlements';

export class PantryCapError extends Error {
  constructor() {
    super('pantry_item_cap_reached');
    this.name = 'PantryCapError';
  }
}

export async function addPantryItem(
  repo: PantryRepository,
  input: AddPantryItemInput,
  entitlements: Entitlements,
): Promise<void> {
  const displayName = input.displayName.trim();
  if (displayName === '') throw new Error('empty_item_name');
  if (input.quantity < 0) throw new Error('invalid_quantity');
  const unit = input.unit.trim();
  if (unit === '') throw new Error('empty_unit');

  const count = await repo.count(input.householdId);
  if (!withinCap(count, entitlements.pantry_item_cap)) throw new PantryCapError();

  await repo.add({ ...input, displayName, unit });
}
