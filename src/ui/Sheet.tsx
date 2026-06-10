// / formsheet content frame
import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface SheetProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function Sheet({ title, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-surface-2" style={{ paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row items-center justify-between px-4 pb-1 pt-3">
        <Text variant="title">{title}</Text>
        <IconButton icon={X} onPress={onClose} accessibilityLabel="Close" tone="ghost" />
      </View>
      <View className="gap-4 px-4 pt-2">{children}</View>
    </View>
  );
}
