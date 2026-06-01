// / scan done state
import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@ui/Button';
import { Icon } from '@ui/Icon';
import { Money } from '@ui/Money';
import { Text } from '@ui/Text';
import { SURFACE_2 } from '@ui/tokens';

export interface ScanDoneProps {
  readonly added: number;
  readonly skipped: number;
  readonly total: number;
  readonly attribution: string;
  readonly onSeePantry: () => void;
}

export function ScanDone({ added, skipped, total, attribution, onSeePantry }: ScanDoneProps) {
  const itemWord = added === 1 ? 'item' : 'items';
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <View className="mb-2 h-16 w-16 items-center justify-center rounded-pill bg-terracotta">
        <Icon icon={Check} accessibilityLabel="" size={30} color={SURFACE_2} />
      </View>
      <Text variant="display-lg" className="text-center">
        {`${added} ${itemWord} added to pantry.`}
      </Text>
      <View className="flex-row flex-wrap items-center justify-center gap-1">
        <Money value={total} />
        <Text variant="body" tone="mid">
          {` logged to ${attribution} · expirations set`}
        </Text>
      </View>
      {skipped > 0 ? (
        <Text variant="meta" tone="urgent" className="text-center">
          {`${skipped} not added (free limit)`}
        </Text>
      ) : null}
      <View className="mt-4 w-full">
        <Button label="See pantry" kind="accent" size="lg" full onPress={onSeePantry} />
      </View>
    </View>
  );
}
