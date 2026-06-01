// / pantry inventory row
import { ChevronRight } from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';

import { daysLeft, groupingTone, type UrgencyTone } from '@domain/entities/pantry-expiry';
import type { PantryItem } from '@domain/entities/pantry-item';
import { Avatar } from '@ui/Avatar';
import { Icon } from '@ui/Icon';
import { Money } from '@ui/Money';
import { Text, type TextTone } from '@ui/Text';
import { MUTED } from '@ui/tokens';
import { UrgencyDot } from '@ui/UrgencyDot';

const textTone: Record<UrgencyTone, TextTone> = {
  urgent: 'urgent',
  soon: 'soon',
  fresh: 'fresh',
  frozen: 'frozen',
  gone: 'urgent',
};

const caption: Record<UrgencyTone, string> = {
  urgent: 'use first',
  soon: 'this week',
  fresh: 'fresh',
  frozen: 'frozen',
  gone: 'expired',
};

export interface PantryRowProps {
  readonly item: PantryItem;
  readonly now: Date;
  readonly onPress?: (item: PantryItem) => void;
  readonly onRemove?: (item: PantryItem) => void;
  readonly last?: boolean;
}

export function PantryRow({ item, now, onPress, onRemove, last = false }: PantryRowProps) {
  const tone = groupingTone(item, now);
  const days = daysLeft(item, now);

  function confirmRemove(): void {
    if (onRemove === undefined) return;
    Alert.alert(`Remove ${item.displayName}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove(item) },
    ]);
  }

  return (
    <Pressable
      onPress={onPress !== undefined ? () => onPress(item) : undefined}
      onLongPress={onRemove !== undefined ? confirmRemove : undefined}
      accessibilityLabel={composeLabel(item, days)}
      className={`flex-row items-center gap-2 px-3 py-3 ${last ? '' : 'border-b border-hairline'}`}
    >
      <View className="w-[14px] items-center">
        <UrgencyDot tone={tone} />
      </View>
      <View className="flex-1">
        <Text variant="body-strong" numberOfLines={1}>
          {item.displayName}
        </Text>
        <View className="mt-[2px] flex-row items-center gap-[6px]">
          <Text variant="meta" tone="muted">
            {item.category}
          </Text>
          <Avatar userId={item.createdByUserId} size={12} />
        </View>
      </View>
      <View className="w-[52px] items-end">
        <Text variant="meta" tone="mid" maxFontSizeMultiplier={1.3}>
          {formatQuantity(item.quantity)}
        </Text>
        <Text variant="eyebrow" tone="muted" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {item.unit}
        </Text>
      </View>
      <View className="w-[56px] items-end">
        <Text variant="meta" tone={textTone[tone]} maxFontSizeMultiplier={1.3}>
          {formatDays(days)}
        </Text>
        {days !== null ? (
          <Text
            variant="eyebrow"
            tone={textTone[tone]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {caption[tone]}
          </Text>
        ) : null}
      </View>
      <View className="w-[52px] items-end">
        {item.lastUnitCost !== null ? (
          <Money value={item.lastUnitCost} />
        ) : (
          <Text variant="meta" tone="muted" maxFontSizeMultiplier={1.3}>
            —
          </Text>
        )}
      </View>
      <Icon icon={ChevronRight} accessibilityLabel="" size={16} color={MUTED} />
    </Pressable>
  );
}

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)));
}

function formatDays(days: number | null): string {
  return days === null ? '—' : `${days}d`;
}

function composeLabel(item: PantryItem, days: number | null): string {
  const quantity = `${formatQuantity(item.quantity)} ${item.unit}`;
  const value = item.lastUnitCost !== null ? `£${item.lastUnitCost.toFixed(2)}` : 'no price';
  return `${item.displayName}, ${quantity}, ${expiryPhrase(item, days)}, ${value}`;
}

function expiryPhrase(item: PantryItem, days: number | null): string {
  if (item.isFrozen) return 'frozen';
  if (days === null) return 'no expiry date';
  if (days < 0) return `expired ${Math.abs(days)} ${dayWord(Math.abs(days))} ago`;
  if (days === 0) return 'expires today';
  return `${days} ${dayWord(days)} left`;
}

function dayWord(count: number): string {
  return count === 1 ? 'day' : 'days';
}
