// / wired shopping list service
import {
  makeShoppingListRepository,
  type AddShoppingListItemInput,
} from '@data/repositories/shopping-list-repository';
import { supabase } from '@foundation/auth/supabase';

import { addToShoppingList } from './add';
import { checkOffItem } from './check-off';
import { listShoppingList, type GroupedShoppingList } from './list';
import { removeShoppingListItem } from './remove';

export interface CheckOffInput {
  readonly id: string;
  readonly householdId: string;
  readonly userId: string;
  readonly checked: boolean;
}

export interface RemoveInput {
  readonly id: string;
  readonly householdId: string;
}

export interface ShoppingListService {
  list(householdId: string): Promise<GroupedShoppingList>;
  add(input: AddShoppingListItemInput): Promise<void>;
  checkOff(input: CheckOffInput): Promise<void>;
  remove(input: RemoveInput): Promise<void>;
}

const repo = makeShoppingListRepository({ supabase });

export const shoppingListService: ShoppingListService = {
  list: (householdId) => listShoppingList(repo, householdId),
  add: (input) => addToShoppingList(repo, input),
  checkOff: (input) => checkOffItem(repo, input),
  remove: (input) => removeShoppingListItem(repo, input),
};
