import type { LucideIcon } from 'lucide-react-native';
import type React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from './Icon';
import { Text, type TextTone } from './Text';
import { INK, SURFACE_2, URGENT_DEEP } from './tokens';

export type ButtonKind = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  readonly onPress: () => void;
  readonly label?: string;
  readonly children?: React.ReactNode;
  readonly kind?: ButtonKind;
  readonly size?: ButtonSize;
  readonly icon?: LucideIcon;
  readonly full?: boolean;
  readonly pill?: boolean;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
}

const baseClass: Record<ButtonKind, string> = {
  primary: 'bg-ink',
  secondary: 'border border-edge bg-surface',
  accent: 'bg-terracotta',
  ghost: 'bg-transparent',
  danger: 'border border-urgency-urgent-bg bg-transparent',
};

const pressedClass: Record<ButtonKind, string> = {
  primary: 'bg-ink-soft',
  secondary: 'border border-edge-press bg-surface-mute',
  accent: 'bg-terracotta-deep',
  ghost: 'bg-surface-mute',
  danger: 'border border-urgency-urgent-bg bg-urgency-urgent-bg',
};

const labelTone: Record<ButtonKind, TextTone> = {
  primary: 'inverse',
  secondary: 'ink',
  accent: 'inverse',
  ghost: 'ink',
  danger: 'urgent',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'gap-1 rounded-2 px-3 py-1',
  md: 'gap-2 rounded-2 px-4 py-2',
  lg: 'gap-2 rounded-3 px-5 py-3',
};

const iconSize: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

const iconColor: Record<ButtonKind, string> = {
  primary: SURFACE_2,
  secondary: INK,
  accent: SURFACE_2,
  ghost: INK,
  danger: URGENT_DEEP,
};

export function Button({
  onPress,
  label,
  children,
  kind = 'primary',
  size = 'md',
  icon,
  full = false,
  pill = false,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {({ pressed }) => (
        <View
          className={`flex-row items-center justify-center ${sizeClass[size]} ${
            pressed && !disabled ? pressedClass[kind] : baseClass[kind]
          } ${pill ? 'rounded-pill' : ''} ${full ? 'w-full' : ''} ${disabled ? 'opacity-40' : ''}`}
        >
          {icon !== undefined ? (
            <Icon icon={icon} accessibilityLabel="" size={iconSize[size]} color={iconColor[kind]} />
          ) : null}
          {label !== undefined ? (
            <Text variant="label" tone={labelTone[kind]}>
              {label}
            </Text>
          ) : (
            children
          )}
        </View>
      )}
    </Pressable>
  );
}
