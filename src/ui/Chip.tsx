// / pressable filter chip
import { Pressable, View } from 'react-native';

import type { UrgencyTone } from '@domain/entities/pantry-expiry';

import { Text } from './Text';
import { UrgencyDot } from './UrgencyDot';

export interface ChipProps {
  readonly label: string;
  readonly active: boolean;
  readonly onPress: () => void;
  readonly count?: number;
  readonly tone?: UrgencyTone;
  readonly accessibilityLabel?: string;
}

export function Chip({ label, active, onPress, count, tone, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      className="justify-center"
      style={{ minHeight: 44 }}
    >
      <View
        className={`flex-row items-center gap-[6px] rounded-pill border px-3 py-[7px] ${
          active ? 'border-ink bg-ink' : 'border-edge bg-transparent'
        }`}
      >
        {tone !== undefined ? <UrgencyDot tone={tone} size={7} /> : null}
        <Text variant="meta" tone={active ? 'inverse' : 'mid'}>
          {label}
        </Text>
        {count !== undefined ? (
          <Text variant="meta" tone={active ? 'inverse' : 'muted'}>
            {String(count)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
