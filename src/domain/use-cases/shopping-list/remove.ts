// / soft delete item
import type { ShoppingListRepository } from '@data/repositories/shopping-list-repository';

export async function removeShoppingListItem(
  repo: ShoppingListRepository,
  input: { id: string; householdId: string },
): Promise<void> {
  await repo.remove(input);
}
