// / shopping list row
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { ownerLabel, type ShoppingListItem } from '@domain/entities/shopping-list-item';
import { Checkbox } from '@ui/Checkbox';
import { IconButton } from '@ui/IconButton';
import { Text } from '@ui/Text';

export interface ShopRowProps {
  readonly item: ShoppingListItem;
  readonly currentUserId: string;
  readonly onToggle: (item: ShoppingListItem) => void;
  readonly onRemove: (item: ShoppingListItem) => void;
}

export function ShopRow({ item, currentUserId, onToggle, onRemove }: ShopRowProps) {
  const quantityLabel = formatQuantity(item);
  const owned = ownerLabel(item, currentUserId) === 'mine';
  return (
    <View className="flex-row items-center gap-3 border-b border-line px-4 py-3">
      <Checkbox
        checked={item.isCheckedOff}
        onPress={() => onToggle(item)}
        accessibilityLabel={`toggle ${item.displayName}`}
      />
      <View className="flex-1">
        <Text
          variant="body"
          tone={item.isCheckedOff ? 'muted' : 'default'}
          className={item.isCheckedOff ? 'line-through' : ''}
        >
          {item.displayName}
        </Text>
        {quantityLabel !== null ? (
          <Text variant="caption" tone="muted">
            {quantityLabel}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" tone="muted">
        {owned ? 'Mine' : 'Household'}
      </Text>
      <IconButton onPress={() => onRemove(item)} accessibilityLabel={`remove ${item.displayName}`}>
        <Ionicons name="trash-outline" size={18} color="#8A8178" />
      </IconButton>
    </View>
  );
}

function formatQuantity(item: ShoppingListItem): string | null {
  if (item.quantity === null) return null;
  return item.unit !== null ? `${item.quantity} ${item.unit}` : String(item.quantity);
}
