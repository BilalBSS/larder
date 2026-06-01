// / currency display
import { Text, View } from 'react-native';

export interface MoneyProps {
  readonly value: number;
  readonly big?: boolean;
}

export function Money({ value, big = false }: MoneyProps) {
  const parts = value.toFixed(2).split('.');
  const whole = parts[0] ?? '0';
  const frac = parts[1] ?? '00';
  const wholeSize = big ? 'text-num-xl' : 'text-num';
  const fracSize = big ? 'text-num-lg' : 'text-num-sm';
  return (
    <View className="flex-row items-baseline">
      <Text maxFontSizeMultiplier={1.3} className={`font-mono-medium text-muted ${wholeSize}`}>
        £
      </Text>
      <Text maxFontSizeMultiplier={1.3} className={`font-mono-medium text-ink ${wholeSize}`}>
        {whole}
      </Text>
      <Text maxFontSizeMultiplier={1.3} className={`font-mono-medium text-mid ${fracSize}`}>
        .{frac}
      </Text>
    </View>
  );
}
