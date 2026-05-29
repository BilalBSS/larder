// / stub reorder banner
import { Sparkle } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from '@ui/Card';
import { Icon } from '@ui/Icon';
import { Text } from '@ui/Text';

export function SmartReorderBanner() {
  return (
    <Card className="flex-row items-center gap-3 border-terracotta-soft bg-terracotta-bg p-3">
      <View className="h-7 w-7 items-center justify-center rounded-pill bg-terracotta">
        <Icon icon={Sparkle} accessibilityLabel="" size={14} color="#FFFCF4" />
      </View>
      <View className="flex-1">
        <Text variant="body-strong" tone="terracotta-deep">
          Things you usually buy
        </Text>
        <Text variant="meta" tone="terracotta-deep" className="mt-[2px]">
          Larder will suggest staples once you&apos;ve scanned a few receipts.
        </Text>
      </View>
    </Card>
  );
}
