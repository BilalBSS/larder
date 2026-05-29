import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

export interface CheckboxProps {
  readonly checked: boolean;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
}

export function Checkbox({ checked, onPress, accessibilityLabel }: CheckboxProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      className={`h-6 w-6 items-center justify-center rounded border ${checked ? 'border-terracotta bg-terracotta' : 'border-line bg-surface'}`}
    >
      {checked ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
    </Pressable>
  );
}
