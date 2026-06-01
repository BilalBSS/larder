// / currency display
import { Text, View } from 'react-native';

import { currencyGlyph, useCurrency } from '@foundation/currency';

export type MoneyTone = 'default' | 'urgent' | 'muted';

export interface MoneyProps {
  readonly value: number;
  readonly big?: boolean;
  readonly tone?: MoneyTone;
}

const glyphTone: Record<MoneyTone, string> = {
  default: 'text-muted',
  urgent: 'text-urgency-urgent-deep',
  muted: 'text-muted',
};

const wholeTone: Record<MoneyTone, string> = {
  default: 'text-ink',
  urgent: 'text-urgency-urgent-deep',
  muted: 'text-muted',
};

const fracTone: Record<MoneyTone, string> = {
  default: 'text-mid',
  urgent: 'text-urgency-urgent-deep',
  muted: 'text-muted',
};

export function Money({ value, big = false, tone = 'default' }: MoneyProps) {
  const glyph = currencyGlyph(useCurrency());
  const parts = value.toFixed(2).split('.');
  const whole = parts[0] ?? '0';
  const frac = parts[1] ?? '00';
  const wholeSize = big ? 'text-num-xl' : 'text-num';
  const fracSize = big ? 'text-num-lg' : 'text-num-sm';
  return (
    <View className="flex-row items-baseline">
      <Text
        maxFontSizeMultiplier={1.3}
        className={`font-mono-medium ${glyphTone[tone]} ${wholeSize}`}
      >
        {glyph}
      </Text>
      <Text
        maxFontSizeMultiplier={1.3}
        className={`font-mono-medium ${wholeTone[tone]} ${wholeSize}`}
      >
        {whole}
      </Text>
      <Text
        maxFontSizeMultiplier={1.3}
        className={`font-mono-medium ${fracTone[tone]} ${fracSize}`}
      >
        .{frac}
      </Text>
    </View>
  );
}
