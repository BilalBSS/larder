import { Camera, type LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Icon } from './Icon';
import { INK, SURFACE_2 } from './tokens';

export interface FABProps {
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
  readonly icon?: LucideIcon;
}

export function FAB({ onPress, accessibilityLabel, icon = Camera }: FABProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="absolute bottom-5 right-4 h-14 w-14 items-center justify-center rounded-pill bg-terracotta active:bg-terracotta-deep"
      style={{
        shadowColor: INK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      <Icon icon={icon} accessibilityLabel="" size={24} color={SURFACE_2} />
    </Pressable>
  );
}
