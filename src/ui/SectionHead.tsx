import { View } from 'react-native';

import { Eyebrow } from './Eyebrow';
import { Text } from './Text';

export interface SectionHeadProps {
  readonly title: string;
  readonly remaining: number;
  readonly total: number;
  readonly first?: boolean;
}

export function SectionHead({ title, remaining, total, first = false }: SectionHeadProps) {
  return (
    <View
      className={`flex-row items-center justify-between bg-surface-mute px-3 py-[10px] ${
        first ? '' : 'border-t border-hairline'
      } border-b border-hairline`}
    >
      <Eyebrow>{title}</Eyebrow>
      <Text variant="meta" tone="mid">
        {`${remaining} of ${total}`}
      </Text>
    </View>
  );
}
