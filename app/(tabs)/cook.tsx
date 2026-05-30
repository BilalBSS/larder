// / cook tab placeholder
import { CookingPot } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@ui/Icon';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';
import { TERRACOTTA } from '@ui/tokens';
import { TopBar } from '@ui/TopBar';

export default function CookScreen() {
  return (
    <Screen edges={['top']}>
      <TopBar eyebrow="Tonight" title="Cook" sub="Recipes from what you have." />
      <View className="flex-1 items-center justify-center px-8">
        <Icon icon={CookingPot} accessibilityLabel="" size={32} color={TERRACOTTA} />
        <Text variant="display" className="mt-4 text-center">
          Cooking is coming soon.
        </Text>
        <Text variant="body" tone="mid" className="mt-2 text-center">
          Stock the pantry and Larder will suggest meals.
        </Text>
      </View>
    </Screen>
  );
}
