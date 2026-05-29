import { View } from 'react-native';

import { Avatar } from './Avatar';
import { Text } from './Text';

export interface AvatarStackMember {
  readonly userId: string;
  readonly label?: string;
}

export interface AvatarStackProps {
  readonly members: readonly AvatarStackMember[];
  readonly size?: number;
  readonly max?: number;
}

export function AvatarStack({ members, size = 18, max = 3 }: AvatarStackProps) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  const overlap = Math.round(size * 0.35);
  return (
    <View className="flex-row items-center">
      {shown.map((member, index) => (
        <View key={member.userId} style={{ marginLeft: index === 0 ? 0 : -overlap }}>
          <Avatar userId={member.userId} label={member.label} size={size} ring />
        </View>
      ))}
      {overflow > 0 ? (
        <Text variant="meta" tone="mid" style={{ marginLeft: 4 }}>
          {`+${overflow}`}
        </Text>
      ) : null}
    </View>
  );
}
