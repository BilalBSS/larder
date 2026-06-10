// / receipt list row
import { Pressable, View } from 'react-native';

import type { Receipt } from '@domain/entities/receipt';
import { monthKey, monthLabel } from '@domain/use-cases/spending/aggregate';
import { Avatar } from '@ui/Avatar';
import { Money } from '@ui/Money';
import { Text } from '@ui/Text';

export interface ReceiptRowProps {
  readonly receipt: Receipt;
  readonly first?: boolean;
  readonly onPress: (receipt: Receipt) => void;
}

export function receiptDateLabel(iso: string): string {
  return `${new Date(iso).getUTCDate()} ${monthLabel(monthKey(iso))}`;
}

export function ReceiptRow({ receipt, first = false, onPress }: ReceiptRowProps) {
  const store = receipt.storeName ?? 'Unknown store';
  return (
    <Pressable
      onPress={() => onPress(receipt)}
      accessibilityRole="button"
      accessibilityLabel={`${store}, ${receiptDateLabel(receipt.purchasedAt)}`}
      className={`flex-row items-center gap-3 px-4 py-3 ${first ? '' : 'border-t border-hairline'}`}
    >
      <Avatar userId={receipt.scannedByUserId} size={16} />
      <View className="flex-1">
        <Text variant="body-strong">{store}</Text>
        <Text variant="meta" tone="mid">
          {receiptDateLabel(receipt.purchasedAt)}
        </Text>
      </View>
      {receipt.ocrStatus === 'pending' ? (
        <Text variant="meta" tone="mid">
          Still processing
        </Text>
      ) : receipt.ocrStatus === 'failed' ? (
        <Text variant="meta" tone="urgent">
          {"Couldn't read"}
        </Text>
      ) : (
        <Money value={receipt.totalAmount} />
      )}
    </Pressable>
  );
}
