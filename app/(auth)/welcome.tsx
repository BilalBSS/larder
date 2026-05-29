import { Link, router } from 'expo-router';
import { Coins, Flame, Receipt } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Icon, Logo, Screen, Text } from '@ui/index';

// / daily-loop bullets
const BULLETS = [
  { icon: Receipt, verb: 'Scan', rest: 'everything updates' },
  { icon: Flame, verb: 'Cook', rest: "tonight's ingredients ready" },
  { icon: Coins, verb: 'Settle', rest: 'who paid for what' },
] as const;

export default function Welcome() {
  return (
    <Screen>
      <View className="flex-1 px-6 pb-4 pt-3">
        <Logo wordmark size={28} />

        <Text variant="display-xl" className="mt-8">
          The pantry app for households who actually cook.
        </Text>
        <Text variant="body" tone="mid" className="mt-4">
          Snap a receipt — your pantry, shopping list, and spending all stay in sync. Cook tonight
          without thinking.
        </Text>

        <View className="mt-8 gap-4">
          {BULLETS.map((bullet) => (
            <View key={bullet.verb} className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-pill border border-hairline">
                <Icon icon={bullet.icon} accessibilityLabel={bullet.verb} size={18} />
              </View>
              <Text variant="body">
                <Text variant="body-strong">{bullet.verb}</Text>
                {` · ${bullet.rest}`}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-1" />

        <Button
          label="Get started"
          kind="accent"
          size="lg"
          full
          onPress={() => router.push('/sign-up')}
        />
        <View className="mt-4 flex-row justify-center gap-1">
          <Text variant="meta" tone="mid">
            Already have an account?
          </Text>
          <Link href="/sign-in">
            <Text variant="meta" tone="terracotta">
              Sign in
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
