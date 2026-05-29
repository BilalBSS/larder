import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { Text } from './Text';
import { INK, MUTED } from './tokens';

export interface TabBarItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export interface TabBarProps {
  readonly items: readonly TabBarItem[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
}

export function TabBar({ items, activeId, onSelect }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-t border-hairline bg-surface" style={{ paddingBottom: insets.bottom }}>
      <View className="flex-row px-1" style={{ height: 60 }} accessibilityRole="tablist">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              className="flex-1 items-center justify-center gap-[2px] py-1"
            >
              <View>
                {active ? (
                  <View className="absolute -top-[6px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-pill bg-terracotta" />
                ) : null}
                <Icon
                  icon={item.icon}
                  accessibilityLabel=""
                  size={22}
                  color={active ? INK : MUTED}
                />
              </View>
              <Text variant="eyebrow" tone={active ? 'ink' : 'muted'}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
