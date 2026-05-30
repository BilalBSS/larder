// / list pantry items
import type { PantryRepository } from '@data/repositories/pantry-repository';
import type { PantryItem } from '@domain/entities/pantry-item';

export async function listPantry(
  repo: PantryRepository,
  householdId: string,
): Promise<PantryItem[]> {
  return repo.list(householdId);
}
