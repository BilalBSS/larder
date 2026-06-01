// / soft delete pantry item
import type { PantryRepository, RemovePantryItemInput } from '@data/repositories/pantry-repository';

export async function removePantryItem(
  repo: PantryRepository,
  input: RemovePantryItemInput,
): Promise<void> {
  await repo.remove(input);
}
