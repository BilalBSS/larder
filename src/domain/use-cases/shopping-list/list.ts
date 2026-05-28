// / grouped shopping list
import type { ShoppingListRepository } from '@data/repositories/shopping-list-repository';
import type { ShoppingListItem } from '@domain/entities/shopping-list-item';

export interface GroupedShoppingList {
  readonly toBuy: ShoppingListItem[];
  readonly gotIt: ShoppingListItem[];
}

export async function listShoppingList(
  repo: ShoppingListRepository,
  householdId: string,
): Promise<GroupedShoppingList> {
  const items = await repo.list(householdId);
  const toBuy = items.filter((item) => !item.isCheckedOff);
  const gotIt = items.filter((item) => item.isCheckedOff);
  return { toBuy, gotIt };
}
