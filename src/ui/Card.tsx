import type React from 'react';
import { View, type ViewProps } from 'react-native';

export type CardPadding = 'none' | 'sm' | 'md';

export interface CardProps extends ViewProps {
  readonly children: React.ReactNode;
  readonly padding?: CardPadding;
  readonly mute?: boolean;
}

const paddingClass: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
};

export function Card({ children, padding = 'none', mute = false, className, ...rest }: CardProps) {
  return (
    <View
      className={`overflow-hidden rounded-3 border border-hairline ${
        mute ? 'bg-surface-mute' : 'bg-surface'
      } ${paddingClass[padding]} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </View>
  );
}
