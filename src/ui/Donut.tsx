// / category ring
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';

import { SURFACE_MUTE } from './tokens';

export interface DonutSlice {
  readonly value: number;
  readonly color: string;
}

export interface DonutProps {
  readonly slices: readonly DonutSlice[];
  readonly accessibilityLabel: string;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly children?: ReactNode;
}

interface Segment {
  readonly key: string;
  readonly color: string;
  readonly length: number;
  readonly offset: number;
}

export function Donut({
  slices,
  accessibilityLabel,
  size = 110,
  strokeWidth = 14,
  children,
}: DonutProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const segments: Segment[] = [];
  let start = 0;
  if (total > 0) {
    slices.forEach((slice, index) => {
      const fraction = slice.value / total;
      segments.push({
        key: `${index}-${slice.color}`,
        color: slice.color,
        length: fraction * circumference,
        offset: start * circumference,
      });
      start += fraction;
    });
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={SURFACE_MUTE}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {segments.map((segment) => (
          <Circle
            key={segment.key}
            cx={center}
            cy={center}
            r={radius}
            stroke={segment.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-segment.offset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
      </Svg>
      <View className="absolute inset-0 items-center justify-center">{children}</View>
    </View>
  );
}
