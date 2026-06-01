// / pantry glance stats
import { Pressable, View } from 'react-native';

import { Eyebrow } from '@ui/Eyebrow';
import { Money } from '@ui/Money';
import { Text } from '@ui/Text';

export interface GlanceBarProps {
  readonly atRisk: number;
  readonly useFirst: number;
  readonly onUseFirst: () => void;
}

export function GlanceBar({ atRisk, useFirst, onUseFirst }: GlanceBarProps) {
  const itemWord = useFirst === 1 ? 'item' : 'items';
  return (
    <View className="flex-row overflow-hidden rounded-3 border border-hairline bg-surface">
      <View className="flex-1 p-4">
        <Eyebrow>At risk</Eyebrow>
        <View className="mt-1">
          <Money value={atRisk} big tone={atRisk > 0 ? 'urgent' : 'muted'} />
        </View>
      </View>
      <Pressable
        onPress={onUseFirst}
        accessibilityRole="button"
        accessibilityLabel={`Use first, ${useFirst} ${itemWord}`}
        className="flex-1 border-l border-hairline p-4 active:bg-surface-mute"
      >
        <Eyebrow>Use first</Eyebrow>
        <View className="mt-1 flex-row items-baseline gap-1">
          <Text variant="num" numSize="xl" tone="urgent" maxFontSizeMultiplier={1.3}>
            {String(useFirst)}
          </Text>
          <Text variant="meta" tone="mid" maxFontSizeMultiplier={1.3}>
            {itemWord}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
