import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from './Icon';

export type IconButtonTone = 'default' | 'inset' | 'accent' | 'ghost';

export interface IconButtonProps {
  readonly icon: LucideIcon;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
  readonly tone?: IconButtonTone;
  readonly size?: number;
  readonly disabled?: boolean;
}

const baseClass: Record<IconButtonTone, string> = {
  default: 'border border-edge bg-transparent',
  inset: 'bg-surface-mute',
  accent: 'bg-terracotta',
  ghost: 'bg-transparent',
};

const pressedClass: Record<IconButtonTone, string> = {
  default: 'border border-edge-press bg-surface-mute',
  inset: 'bg-edge',
  accent: 'bg-terracotta-deep',
  ghost: 'bg-surface-mute',
};

const iconColor: Record<IconButtonTone, string> = {
  default: '#1C1814',
  inset: '#1C1814',
  accent: '#FFFCF4',
  ghost: '#1C1814',
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = 'default',
  size = 36,
  disabled = false,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      {({ pressed }) => (
        <View
          className={`items-center justify-center rounded-pill ${
            pressed && !disabled ? pressedClass[tone] : baseClass[tone]
          } ${disabled ? 'opacity-40' : ''}`}
          style={{ width: size, height: size }}
        >
          <Icon
            icon={icon}
            accessibilityLabel=""
            size={Math.round(size * 0.5)}
            color={iconColor[tone]}
          />
        </View>
      )}
    </Pressable>
  );
}
