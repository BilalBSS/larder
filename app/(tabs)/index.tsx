// / pantry home placeholder
import { Camera, PencilLine } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@ui/Button';
import { Logo } from '@ui/Logo';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';

export default function PantryScreen() {
  return (
    <Screen className="items-center justify-center px-8">
      <Logo size={40} wordmark />
      <Text variant="display-lg" className="mt-8 text-center">
        Let&apos;s stock the pantry.
      </Text>
      <Text variant="body" tone="mid" className="mt-2 text-center">
        Snap a receipt to start.
      </Text>
      <View className="mt-8 w-full gap-3">
        <Button label="Scan a receipt" kind="accent" size="lg" icon={Camera} full onPress={noop} />
        <Button label="Add by hand" kind="ghost" size="lg" icon={PencilLine} full onPress={noop} />
      </View>
    </Screen>
  );
}

function noop(): void {}
