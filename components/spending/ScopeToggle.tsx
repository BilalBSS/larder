// / household mine segmented control
import { Pressable, View } from 'react-native';

import type { SpendScope } from '@domain/use-cases/spending/view-model';
import { Text } from '@ui/Text';

export interface ScopeToggleProps {
  readonly value: SpendScope;
  readonly onChange: (scope: SpendScope) => void;
}

const OPTIONS: readonly { key: SpendScope; label: string }[] = [
  { key: 'household', label: 'Household' },
  { key: 'mine', label: 'Mine' },
];

export function ScopeToggle({ value, onChange }: ScopeToggleProps) {
  return (
    <View className="flex-row rounded-pill bg-surface-mute p-[2px]" accessibilityRole="tablist">
      {OPTIONS.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`flex-1 items-center rounded-pill py-1 ${
              selected ? 'border border-hairline bg-surface' : ''
            }`}
          >
            <Text variant="label" tone={selected ? 'ink' : 'mid'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
