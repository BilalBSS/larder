// / meter bar
import { View } from 'react-native';

import { SURFACE_MUTE } from './tokens';

export interface BarProps {
  readonly value: number;
  readonly max?: number;
  readonly color: string;
  readonly height?: number;
  readonly trackColor?: string;
}

export function Bar({ value, max = 100, color, height = 4, trackColor }: BarProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View
      className="overflow-hidden rounded-pill"
      style={{ height, backgroundColor: trackColor ?? SURFACE_MUTE }}
    >
      <View
        testID="bar-fill"
        className="rounded-pill"
        style={{ width: `${pct}%`, height, backgroundColor: color }}
      />
    </View>
  );
}
