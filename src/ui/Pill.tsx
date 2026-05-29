import type React from 'react';
import { View, type ViewProps } from 'react-native';

export type PillTone = 'surface' | 'mute' | 'accent';

export interface PillProps extends ViewProps {
  readonly children: React.ReactNode;
  readonly tone?: PillTone;
}

const toneClass: Record<PillTone, string> = {
  surface: 'border border-hairline bg-surface',
  mute: 'bg-surface-mute',
  accent: 'border border-terracotta-soft bg-terracotta-bg',
};

export function Pill({ children, tone = 'surface', className, ...rest }: PillProps) {
  return (
    <View
      className={`flex-row items-center gap-2 rounded-pill px-3 py-1 ${toneClass[tone]} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </View>
  );
}
