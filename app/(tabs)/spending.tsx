// / spending tab placeholder
import { Wallet } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@ui/Icon';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';
import { TopBar } from '@ui/TopBar';

// / terracotta accent token
const TERRACOTTA = '#B5532D';

export default function SpendingScreen() {
  return (
    <Screen>
      <TopBar eyebrow="This month" title="Spending" sub="What your food actually costs." />
      <View className="flex-1 items-center justify-center px-8">
        <Icon icon={Wallet} accessibilityLabel="" size={32} color={TERRACOTTA} />
        <Text variant="display" className="mt-4 text-center">
          Spending is coming soon.
        </Text>
        <Text variant="body" tone="mid" className="mt-2 text-center">
          Scan a receipt and Larder will track cost per meal.
        </Text>
      </View>
    </Screen>
  );
}
