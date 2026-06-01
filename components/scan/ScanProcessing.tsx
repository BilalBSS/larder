// / scan processing state
import { RotateCcw, Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@ui/Button';
import { Icon } from '@ui/Icon';
import { Text } from '@ui/Text';
import { TERRACOTTA } from '@ui/tokens';

export type ProcessingState = 'working' | 'slow' | 'failed';

export interface ScanProcessingProps {
  readonly state: ProcessingState;
  readonly onRetry: () => void;
  readonly onAddByHand: () => void;
}

export function ScanProcessing({ state, onRetry, onAddByHand }: ScanProcessingProps) {
  if (state === 'failed') {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <Text variant="display-lg" className="text-center">
          Couldn&apos;t read that receipt.
        </Text>
        <Text variant="body" tone="mid" className="text-center">
          Try again or add the items by hand.
        </Text>
        <View className="mt-4 w-full gap-2">
          <Button
            label="Try again"
            kind="accent"
            size="lg"
            icon={RotateCcw}
            full
            onPress={onRetry}
          />
          <Button label="Add by hand" kind="secondary" size="lg" full onPress={onAddByHand} />
        </View>
      </View>
    );
  }
  return (
    <View
      className="flex-1 items-center justify-center gap-3 px-8"
      accessibilityLiveRegion="polite"
    >
      <Icon icon={Sparkles} accessibilityLabel="" size={32} color={TERRACOTTA} />
      <Text variant="display-lg" className="text-center">
        Reading your receipt…
      </Text>
      {state === 'slow' ? (
        <Text variant="body" tone="mid" className="text-center">
          Still reading… large receipts take a moment.
        </Text>
      ) : null}
    </View>
  );
}
