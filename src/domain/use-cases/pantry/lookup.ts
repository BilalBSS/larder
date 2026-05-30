// / canonical autofill lookup
import type { CanonicalIngredientRepository } from '@data/repositories/canonical-ingredient-repository';
import type { CanonicalMatch } from '@data/dtos/canonical-ingredient-dto';

export async function lookupCanonical(
  repo: CanonicalIngredientRepository,
  name: string,
): Promise<CanonicalMatch | null> {
  return repo.lookup(name);
}
