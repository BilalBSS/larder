// / you tab placeholder
import { View } from 'react-native';

import { useUser } from '@foundation/context';
import { Avatar } from '@ui/Avatar';
import { Card } from '@ui/Card';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';
import { TopBar } from '@ui/TopBar';

export default function YouScreen() {
  const user = useUser();

  return (
    <Screen>
      <TopBar eyebrow="Account" title="You" sub="Your household and settings." />
      <View className="flex-1 gap-3 px-4">
        {user !== null ? (
          <Card padding="md">
            <View className="flex-row items-center gap-3">
              <Avatar userId={user.id} size={40} />
              <View>
                <Text variant="body-strong">Signed in</Text>
                <Text variant="meta" tone="mid">
                  {user.household_id !== null ? 'In a household' : 'No household yet'}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}
        <View className="flex-1 items-center justify-center">
          <Text variant="display" className="text-center">
            Settings are coming soon.
          </Text>
          <Text variant="body" tone="mid" className="mt-2 text-center">
            Manage your household and preferences here.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
