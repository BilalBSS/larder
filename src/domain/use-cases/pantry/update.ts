// / update validated pantry item
import type { PantryRepository, UpdatePantryItemInput } from '@data/repositories/pantry-repository';

export async function updatePantryItem(
  repo: PantryRepository,
  input: UpdatePantryItemInput,
): Promise<void> {
  if (input.quantity !== undefined && input.quantity < 0) throw new Error('invalid_quantity');
  await repo.update(input);
}
