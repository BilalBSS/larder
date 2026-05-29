// / add validated item
import type {
  AddShoppingListItemInput,
  ShoppingListRepository,
} from '@data/repositories/shopping-list-repository';

export async function addToShoppingList(
  repo: ShoppingListRepository,
  input: AddShoppingListItemInput,
): Promise<void> {
  const displayName = input.displayName.trim();
  if (displayName === '') throw new Error('empty_item_name');
  await repo.add({ ...input, displayName });
}
