// / toggle checked state
import type { ShoppingListRepository } from '@data/repositories/shopping-list-repository';

export async function checkOffItem(
  repo: ShoppingListRepository,
  input: { id: string; householdId: string; userId: string; checked: boolean },
): Promise<void> {
  await repo.setChecked(input);
}
