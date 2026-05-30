import type React from 'react';
import { View } from 'react-native';

import { Eyebrow } from './Eyebrow';
import { Logo } from './Logo';
import { Text } from './Text';

export interface TopBarProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly sub?: string;
  readonly leading?: React.ReactNode;
  readonly trailing?: React.ReactNode;
}

export function TopBar({ title, eyebrow, sub, leading, trailing }: TopBarProps) {
  return (
    <View className="bg-paper px-4 pb-4 pt-2">
      <View className="h-9 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {leading ?? <Logo wordmark size={22} />}
        </View>
        <View className="flex-row items-center gap-2">{trailing}</View>
      </View>
      <View className="mt-1">
        {eyebrow !== undefined ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Text
          variant="display-lg"
          numberOfLines={1}
          className={eyebrow !== undefined ? 'mt-1' : ''}
        >
          {title}
        </Text>
        {sub !== undefined ? (
          <Text variant="meta" tone="mid" className="mt-1">
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
