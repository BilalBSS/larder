import type React from 'react';
import { Pressable } from 'react-native';

export interface IconButtonProps {
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
  readonly children: React.ReactNode;
  readonly disabled?: boolean;
}

export function IconButton({
  onPress,
  accessibilityLabel,
  children,
  disabled = false,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      className={`h-10 w-10 items-center justify-center rounded-full ${disabled ? 'opacity-40' : ''}`}
    >
      {children}
    </Pressable>
  );
}
