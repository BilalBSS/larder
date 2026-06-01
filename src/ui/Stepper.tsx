// / quantity stepper
import { Minus, Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface StepperProps {
  readonly value: number;
  readonly onChange: (next: number) => void;
  readonly min?: number;
  readonly step?: number;
  readonly label?: string;
}

export function Stepper({ value, onChange, min = 0, step = 1, label = 'quantity' }: StepperProps) {
  const atMin = value <= min;
  const decrease = (): void => onChange(Math.max(min, round(value - step)));
  const increase = (): void => onChange(round(value + step));
  return (
    <View className="flex-row items-center gap-3">
      <IconButton
        icon={Minus}
        onPress={decrease}
        accessibilityLabel={`Decrease ${label}`}
        tone="inset"
        size={44}
        disabled={atMin}
      />
      <Text
        variant="num"
        numSize="lg"
        maxFontSizeMultiplier={1.3}
        accessibilityLabel={`${label} ${format(value)}`}
        className="w-[56px] text-center"
      >
        {format(value)}
      </Text>
      <IconButton
        icon={Plus}
        onPress={increase}
        accessibilityLabel={`Increase ${label}`}
        tone="inset"
        size={44}
      />
    </View>
  );
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}
