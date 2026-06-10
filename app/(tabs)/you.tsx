// / you tab
import { ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { supabase } from '@foundation/auth/supabase';
import { useUser } from '@foundation/context';
import { useCurrency } from '@foundation/currency';
import { Avatar } from '@ui/Avatar';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { Eyebrow } from '@ui/Eyebrow';
import { Icon } from '@ui/Icon';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';
import { MUTED } from '@ui/tokens';
import { TopBar } from '@ui/TopBar';

export default function YouScreen() {
  const user = useUser();
  const currency = useCurrency();

  return (
    <Screen edges={['top']}>
      <TopBar eyebrow="Account" title="You" sub="Your household and settings." />
      <View className="flex-1 gap-3 px-4">
        {user !== null ? (
          <Card padding="md">
            <View className="flex-row items-center gap-3">
              <Avatar userId={user.id} size={40} />
              <View>
                <Text variant="body-strong">Signed in</Text>
                <Text variant="meta" tone="mid">
                  In a household
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card>
          <Pressable
            onPress={() => router.push('/currency')}
            accessibilityRole="button"
            accessibilityLabel={`Currency, ${currency}`}
            className="flex-row items-center justify-between px-4"
            style={{ minHeight: 52 }}
          >
            <View>
              <Eyebrow>Currency</Eyebrow>
              <Text variant="body" className="mt-[2px]">
                {currency}
              </Text>
            </View>
            <Icon icon={ChevronRight} accessibilityLabel="" size={18} color={MUTED} />
          </Pressable>
        </Card>

        <View className="flex-1" />
        <View className="pb-4">
          <Button label="Sign out" kind="secondary" onPress={signOut} full />
        </View>
      </View>
    </Screen>
  );
}

// / end the session
function signOut(): void {
  void supabase.auth.signOut();
}
