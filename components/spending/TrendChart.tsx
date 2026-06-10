// / six month bars
import { View } from 'react-native';

import type { MonthBucket } from '@domain/use-cases/spending/aggregate';
import { Card } from '@ui/Card';
import { Text } from '@ui/Text';
import { EDGE, TERRACOTTA } from '@ui/tokens';

export interface TrendChartProps {
  readonly buckets: MonthBucket[];
  readonly glyph: string;
}

const CHART_HEIGHT = 110;
const BAR_MAX_HEIGHT = 80;

export function TrendChart({ buckets, glyph }: TrendChartProps) {
  const max = Math.max(...buckets.map((bucket) => bucket.total), 0);
  return (
    <Card padding="md">
      <View className="flex-row items-end gap-2" style={{ height: CHART_HEIGHT }}>
        {buckets.map((bucket) => (
          <View
            key={bucket.key}
            accessible
            accessibilityLabel={`${bucket.label}, ${glyph}${bucket.total.toFixed(2)}`}
            className="flex-1 items-center justify-end gap-1"
          >
            <Text
              variant="num"
              numSize="sm"
              tone={bucket.current ? 'ink' : 'mid'}
              maxFontSizeMultiplier={1.3}
            >
              {`${glyph}${Math.round(bucket.total)}`}
            </Text>
            <View
              className="w-full rounded-1"
              style={{
                height: max > 0 ? Math.round((bucket.total / max) * BAR_MAX_HEIGHT) : 0,
                backgroundColor: bucket.current ? TERRACOTTA : EDGE,
              }}
            />
            <Text variant="meta" tone="mid">
              {bucket.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
