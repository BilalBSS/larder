import type React from 'react';
import { Pressable } from 'react-native';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  readonly onPress: () => void;
  readonly label?: string;
  readonly children?: React.ReactNode;
  readonly variant?: Variant;
  readonly disabled?: boolean;
}

const containerClass: Record<Variant, string> = {
  primary: 'bg-terracotta',
  secondary: 'bg-surface border border-line',
  ghost: 'bg-transparent',
};

const labelTone: Record<Variant, 'inverse' | 'default' | 'terracotta'> = {
  primary: 'inverse',
  secondary: 'default',
  ghost: 'terracotta',
};

export function Button({
  onPress,
  label,
  children,
  variant = 'primary',
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`flex-row items-center justify-center rounded-lg px-4 py-3 ${containerClass[variant]} ${disabled ? 'opacity-40' : ''}`}
    >
      {label !== undefined ? (
        <Text variant="label" tone={labelTone[variant]}>
          {label}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
