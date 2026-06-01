// / get one pantry item
import type { PantryRepository } from '@data/repositories/pantry-repository';
import type { PantryItem } from '@domain/entities/pantry-item';

export async function getPantryItem(
  repo: PantryRepository,
  id: string,
  householdId: string,
): Promise<PantryItem | null> {
  return repo.get(id, householdId);
}
