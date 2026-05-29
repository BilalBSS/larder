// / shopping list screen
import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, View } from 'react-native';

import { QuickAddBar } from '@/components/shopping/QuickAddBar';
import { ShopRow } from '@/components/shopping/ShopRow';
import { useShoppingList } from '@/components/shopping/useShoppingList';
import type { ShoppingListItem } from '@domain/entities/shopping-list-item';
import { useUser } from '@foundation/context';
import { Button } from '@ui/Button';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';

type Row =
  | { readonly kind: 'header'; readonly key: string; readonly title: string }
  | { readonly kind: 'item'; readonly key: string; readonly item: ShoppingListItem };

export default function ShoppingScreen() {
  const user = useUser();
  const householdId = user?.household_id ?? null;
  const currentUserId = user?.id ?? '';
  const { toBuy, gotIt, loading, error, add, toggle, remove, reload } = useShoppingList({
    householdId,
    userId: currentUserId,
  });

  if (householdId === null) {
    return (
      <Screen className="items-center justify-center px-8">
        <Text variant="heading">No household yet</Text>
        <Text variant="body" tone="muted" className="mt-2 text-center">
          Join or create a household to start a shared shopping list.
        </Text>
      </Screen>
    );
  }

  const rows = buildRows(toBuy, gotIt);

  return (
    <Screen>
      <QuickAddBar onAdd={add} />
      {error !== null ? (
        <View className="flex-row items-center justify-between px-4 py-2">
          <Text variant="caption" tone="terracotta">
            Could not load your list.
          </Text>
          <Button label="Retry" variant="ghost" onPress={reload} />
        </View>
      ) : null}
      <FlashList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={({ item: row }) =>
          row.kind === 'header' ? (
            <Text variant="label" tone="muted" className="px-4 pb-1 pt-4">
              {row.title}
            </Text>
          ) : (
            <ShopRow
              item={row.item}
              currentUserId={currentUserId}
              onToggle={toggle}
              onRemove={remove}
            />
          )
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center px-8 py-16">
              <ActivityIndicator testID="shopping-loading" color="#C8663F" />
            </View>
          ) : (
            <View className="items-center px-8 py-16">
              <Text variant="body" tone="muted" className="text-center">
                Your list is empty. Add something above.
              </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

function buildRows(toBuy: ShoppingListItem[], gotIt: ShoppingListItem[]): Row[] {
  const rows: Row[] = [];
  if (toBuy.length > 0) {
    rows.push({ kind: 'header', key: 'h-to-buy', title: 'To buy' });
    for (const item of toBuy) rows.push({ kind: 'item', key: item.id, item });
  }
  if (gotIt.length > 0) {
    rows.push({ kind: 'header', key: 'h-got-it', title: 'Got it' });
    for (const item of gotIt) rows.push({ kind: 'item', key: item.id, item });
  }
  return rows;
}
