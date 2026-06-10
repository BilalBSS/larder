// / store ranking list
import { View } from 'react-native';

import type { StoreSpend } from '@domain/use-cases/spending/aggregate';
import { Card } from '@ui/Card';
import { Money } from '@ui/Money';
import { Text } from '@ui/Text';

export interface StoreListProps {
  readonly rows: StoreSpend[];
  readonly glyph: string;
}

const TOP_STORES = 4;

export function StoreList({ rows, glyph }: StoreListProps) {
  return (
    <Card padding="none">
      {rows.slice(0, TOP_STORES).map((store, index) => (
        <View
          key={store.name}
          className={`flex-row items-center justify-between px-4 py-3 ${
            index === 0 ? '' : 'border-t border-hairline'
          }`}
        >
          <View className="flex-1 pr-3">
            <Text variant="body-strong">{store.name}</Text>
            <Text variant="meta" tone="mid">
              {`${store.receiptCount} ${store.receiptCount === 1 ? 'receipt' : 'receipts'} · ${glyph}${Math.round(store.average)} avg`}
            </Text>
          </View>
          <Money value={store.total} />
        </View>
      ))}
    </Card>
  );
}
