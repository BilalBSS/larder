// / category donut legend
import { View } from 'react-native';

import type { CategoryBreakdown } from '@domain/use-cases/spending/aggregate';
import { Card } from '@ui/Card';
import { Donut } from '@ui/Donut';
import { Eyebrow } from '@ui/Eyebrow';
import { Money } from '@ui/Money';
import { Text } from '@ui/Text';
import { MID } from '@ui/tokens';

import { sliceColors } from './donut-colors';

export interface CategoryDonutProps {
  readonly breakdown: CategoryBreakdown;
  readonly glyph: string;
}

export function CategoryDonut({ breakdown, glyph }: CategoryDonutProps) {
  const colors = sliceColors(breakdown.slices);
  const summary = `Spending by category: ${breakdown.slices
    .map((slice) => `${slice.name} ${glyph}${slice.total.toFixed(2)}`)
    .join(', ')}.`;
  return (
    <Card padding="md">
      <View className="flex-row items-center gap-4">
        <Donut
          slices={breakdown.slices.map((slice, index) => ({
            value: slice.total,
            color: colors[index] ?? MID,
          }))}
          accessibilityLabel={summary}
        >
          <Eyebrow>Items</Eyebrow>
          <Text variant="num" numSize="lg" maxFontSizeMultiplier={1.3}>
            {`${glyph}${Math.round(breakdown.itemizedTotal)}`}
          </Text>
        </Donut>
        <View className="flex-1 gap-2">
          {breakdown.slices.map((slice, index) => (
            <View key={slice.name} className="flex-row items-center gap-2">
              <View
                className="h-2 w-2 rounded-1"
                style={{ backgroundColor: colors[index] ?? MID }}
              />
              <Text variant="body" className="flex-1">
                {slice.name}
              </Text>
              <Text variant="num" numSize="sm" tone="mid" maxFontSizeMultiplier={1.3}>
                {`${slice.pct}%`}
              </Text>
              <Money value={slice.total} />
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
