import { Barcode, Plus } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

import { Icon } from './Icon';
import { IconButton } from './IconButton';

// / muted placeholder token
const PLACEHOLDER = '#9A8F82';
// / mid icon token
const MID = '#6B6359';

export interface QuickAddProps {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly onSubmit: () => void;
  readonly onScan?: (() => void) | undefined;
  readonly placeholder?: string | undefined;
  readonly inputAccessibilityLabel: string;
  readonly scanAccessibilityLabel?: string;
  readonly editable?: boolean;
}

export function QuickAdd({
  value,
  onChangeText,
  onSubmit,
  onScan,
  placeholder,
  inputAccessibilityLabel,
  scanAccessibilityLabel = 'Scan barcode',
  editable = true,
}: QuickAddProps) {
  return (
    <View className="flex-row items-center gap-2 rounded-pill border border-hairline bg-surface py-[6px] pl-4 pr-[6px]">
      <Icon icon={Plus} accessibilityLabel="" size={16} color={MID} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER}
        returnKeyType="done"
        accessibilityLabel={inputAccessibilityLabel}
        className="flex-1 font-manrope-medium text-body text-ink"
      />
      {onScan !== undefined ? (
        <IconButton
          icon={Barcode}
          onPress={onScan}
          accessibilityLabel={scanAccessibilityLabel}
          tone="inset"
          size={28}
        />
      ) : null}
    </View>
  );
}
