import { Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { INK } from './tokens';

export interface LogoProps {
  readonly size?: number;
  readonly color?: string;
  readonly wordmark?: boolean;
}

// / jar mark, 64 viewbox
function JarMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect x={18} y={8} width={28} height={6} rx={1.5} fill={color} />
      <Line
        x1={20}
        y1={14}
        x2={44}
        y2={14}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M16 18 Q16 16 18 16 L46 16 Q48 16 48 18 L48 54 Q48 58 44 58 L20 58 Q16 58 16 54 Z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <Line
        x1={20}
        y1={36}
        x2={44}
        y2={36}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="2 3"
        opacity={0.55}
      />
      <Rect x={22} y={40} width={20} height={10} rx={1} fill={color} opacity={0.12} />
      <Line x1={26} y1={45} x2={38} y2={45} stroke={color} strokeWidth={1.6} opacity={0.55} />
    </Svg>
  );
}

export function Logo({ size = 28, color = INK, wordmark = false }: LogoProps) {
  if (!wordmark) {
    return <JarMark size={size} color={color} />;
  }

  return (
    <View
      className="flex-row items-center"
      style={{ gap: size * 0.28 }}
      accessibilityRole="header"
      accessibilityLabel="Larder"
    >
      <JarMark size={size} color={color} />
      <Text
        style={{
          fontFamily: 'Newsreader_600SemiBold',
          fontSize: size * 1.05,
          letterSpacing: -size * 0.025,
          color,
        }}
      >
        Larder
      </Text>
    </View>
  );
}
