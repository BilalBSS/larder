import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from './Icon';

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
    >
      <View
        className={`h-[22px] w-[22px] items-center justify-center rounded-2 border ${
          checked ? 'border-urgency-fresh bg-urgency-fresh' : 'border-edge bg-surface'
        }`}
      >
        {checked ? <Icon icon={Check} accessibilityLabel="" size={14} color="#FFFCF4" /> : null}
      </View>
    </Pressable>
  );
}
