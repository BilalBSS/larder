import { Text, View } from 'react-native';

import { deriveAvatarColor } from './avatar-color';

// / cream initials token
const INITIAL_COLOR = '#FFFCF4';

export interface AvatarProps {
  readonly userId: string;
  readonly label?: string | undefined;
  readonly size?: number;
  readonly ring?: boolean;
}

function initial(userId: string, label?: string): string {
  const source = label !== undefined && label.trim() !== '' ? label.trim() : userId;
  return (source[0] ?? '?').toUpperCase();
}

export function Avatar({ userId, label, size = 22, ring = false }: AvatarProps) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label ?? userId}
      className={`items-center justify-center rounded-pill ${ring ? 'border-2 border-surface' : ''}`}
      style={{ width: size, height: size, backgroundColor: deriveAvatarColor(userId) }}
    >
      <Text
        style={{
          fontFamily: 'Manrope_600SemiBold',
          fontSize: Math.round(size * 0.45),
          color: INITIAL_COLOR,
        }}
      >
        {initial(userId, label)}
      </Text>
    </View>
  );
}
