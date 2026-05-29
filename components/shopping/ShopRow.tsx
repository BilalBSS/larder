// / shopping list row
import { Sparkle } from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';

import { ownerLabel, type ShoppingListItem } from '@domain/entities/shopping-list-item';
import { Avatar } from '@ui/Avatar';
import { Checkbox } from '@ui/Checkbox';
import { Icon } from '@ui/Icon';
import { Text } from '@ui/Text';

// / terracotta accent token
const TERRACOTTA = '#B5532D';

export interface ShopRowProps {
  readonly item: ShoppingListItem;
  readonly currentUserId: string;
  readonly onToggle: (item: ShoppingListItem) => void;
  readonly onRemove?: (item: ShoppingListItem) => void;
  readonly last?: boolean;
  readonly smart?: boolean;
}

export function ShopRow({
  item,
  currentUserId,
  onToggle,
  onRemove,
  last = false,
  smart = false,
}: ShopRowProps) {
  const quantityLabel = formatQuantity(item);
  const owned = ownerLabel(item, currentUserId) === 'mine';
  const checked = item.isCheckedOff;
  const ownerId = item.ownerUserId ?? item.addedByUserId;

  function confirmRemove(): void {
    if (onRemove === undefined) return;
    Alert.alert(`Remove ${item.displayName}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove(item) },
    ]);
  }

  return (
    <Pressable
      onLongPress={onRemove !== undefined ? confirmRemove : undefined}
      className={`flex-row items-center gap-3 px-3 py-3 ${last ? '' : 'border-b border-hairline'}`}
    >
      <Checkbox
        checked={checked}
        onPress={() => onToggle(item)}
        accessibilityLabel={`toggle ${item.displayName}`}
      />
      <View className="flex-1">
        <Text
          variant="body-strong"
          tone={checked ? 'muted' : 'ink'}
          className={checked ? 'line-through' : ''}
        >
          {item.displayName}
        </Text>
        <View className="mt-[2px] flex-row items-center gap-[6px]">
          {quantityLabel !== null ? (
            <Text variant="meta" tone="mid">
              {quantityLabel}
            </Text>
          ) : null}
          {smart ? (
            <>
              <Text variant="meta" tone="muted">
                ·
              </Text>
              <View className="flex-row items-center gap-[3px]">
                <Icon icon={Sparkle} accessibilityLabel="" size={10} color={TERRACOTTA} />
                <Text variant="meta" tone="terracotta-deep">
                  smart re-order
                </Text>
              </View>
            </>
          ) : null}
          {owned ? (
            <>
              <Text variant="meta" tone="muted">
                ·
              </Text>
              <Text variant="meta" tone="mid">
                mine
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <Avatar userId={ownerId} size={20} />
    </Pressable>
  );
}

function formatQuantity(item: ShoppingListItem): string | null {
  if (item.quantity === null) return null;
  return item.unit !== null ? `${item.quantity} ${item.unit}` : String(item.quantity);
}
