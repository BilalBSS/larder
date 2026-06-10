// / month total card
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { proseAmount, type HeroVM } from '@domain/use-cases/spending/view-model';
import { Bar } from '@ui/Bar';
import { Card } from '@ui/Card';
import { Eyebrow } from '@ui/Eyebrow';
import { Icon } from '@ui/Icon';
import { Text } from '@ui/Text';
import { FRESH, TERRACOTTA } from '@ui/tokens';

export interface HeroCardProps {
  readonly hero: HeroVM;
  readonly glyph: string;
  readonly onEditBudget: () => void;
}

export function HeroCard({ hero, glyph, onEditBudget }: HeroCardProps) {
  const down = hero.deltaPct !== null && hero.deltaPct < 0;
  return (
    <Card padding="md">
      <Eyebrow>{hero.eyebrow}</Eyebrow>
      <View
        accessible
        accessibilityLabel={`${hero.eyebrow}, ${glyph}${hero.total.toFixed(2)}`}
        className="mt-1 flex-row items-baseline gap-2"
      >
        <View className="flex-row items-baseline">
          <Text className="font-mono-medium text-num-xl text-muted" maxFontSizeMultiplier={1.3}>
            {glyph}
          </Text>
          <Text className="font-mono-medium text-num-display text-ink" maxFontSizeMultiplier={1.3}>
            {Math.round(hero.total)}
          </Text>
        </View>
        {hero.deltaLabel !== null ? (
          <View
            accessible
            accessibilityLabel={hero.deltaSpoken ?? hero.deltaLabel}
            className="flex-row items-center gap-1"
          >
            <Icon
              icon={down ? ArrowDown : ArrowUp}
              accessibilityLabel=""
              size={14}
              color={down ? FRESH : TERRACOTTA}
            />
            <Text variant="label" tone={down ? 'fresh' : 'terracotta'}>
              {hero.deltaLabel}
            </Text>
          </View>
        ) : null}
      </View>
      {hero.budget !== null ? (
        <Pressable
          onPress={onEditBudget}
          accessibilityRole="button"
          accessibilityLabel="Edit budget"
          className="mt-2 gap-2"
        >
          <View className="flex-row gap-1">
            <Text variant="meta" tone="mid">
              {`${proseAmount(glyph, hero.budget.limit)} budget ·`}
            </Text>
            {hero.budget.over > 0 ? (
              <Text variant="meta" tone="urgent">
                {`${proseAmount(glyph, hero.budget.over)} over`}
              </Text>
            ) : (
              <Text variant="meta" tone="fresh">
                {`${proseAmount(glyph, hero.budget.remaining)} left`}
              </Text>
            )}
          </View>
          <Bar value={hero.budget.spent} max={hero.budget.limit} color={TERRACOTTA} />
        </Pressable>
      ) : (
        <Pressable onPress={onEditBudget} accessibilityRole="button" className="mt-2 self-start">
          <Text variant="meta" tone="terracotta">
            Add a budget to track this.
          </Text>
        </Pressable>
      )}
      {hero.pendingNote ? (
        <Text variant="meta" tone="mid" className="mt-2">
          Receipts appear here once a scan finishes.
        </Text>
      ) : null}
    </Card>
  );
}
