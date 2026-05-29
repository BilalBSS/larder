// / shopping list row
import { ChevronRight, Sparkle } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { ownerLabel, type ShoppingListItem } from '@domain/entities/shopping-list-item';
import { Avatar } from '@ui/Avatar';
import { Checkbox } from '@ui/Checkbox';
import { Icon } from '@ui/Icon';
import { Text } from '@ui/Text';

// / muted chevron token
const MUTED = '#9A8F82';
// / terracotta accent token
const TERRACOTTA = '#B5532D';

export interface ShopRowProps {
  readonly item: ShoppingListItem;
  readonly currentUserId: string;
  readonly onToggle: (item: ShoppingListItem) => void;
  readonly onOpen?: (item: ShoppingListItem) => void;
  readonly last?: boolean;
  readonly smart?: boolean;
}

export function ShopRow({
  item,
  currentUserId,
  onToggle,
  onOpen,
  last = false,
  smart = false,
}: ShopRowProps) {
  const quantityLabel = formatQuantity(item);
  const owned = ownerLabel(item, currentUserId) === 'mine';
  const checked = item.isCheckedOff;
  const ownerId = item.ownerUserId ?? item.addedByUserId;
  return (
    <Pressable
      onPress={onOpen !== undefined ? () => onOpen(item) : undefined}
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
                <Text variant="meta" tone="terracotta">
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
      <Icon icon={ChevronRight} accessibilityLabel="" size={14} color={MUTED} />
    </Pressable>
  );
}

function formatQuantity(item: ShoppingListItem): string | null {
  if (item.quantity === null) return null;
  return item.unit !== null ? `${item.quantity} ${item.unit}` : String(item.quantity);
}
