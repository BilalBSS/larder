// / shopping list value object
export interface ShoppingListItem {
  id: string;
  householdId: string;
  canonicalName: string;
  displayName: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  addedByUserId: string;
  ownerUserId: string | null;
  isAutoAdded: boolean;
  isCheckedOff: boolean;
  checkedOffAt: string | null;
  checkedOffByUserId: string | null;
  createdAt: string;
}

export { normalizeName } from './normalize';

export function ownerLabel(
  item: Pick<ShoppingListItem, 'ownerUserId'>,
  currentUserId: string,
): 'mine' | 'household' {
  return item.ownerUserId === currentUserId ? 'mine' : 'household';
}
