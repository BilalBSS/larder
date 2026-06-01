// / scan reconcile state
import { Pencil, Trash2 } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { currencyGlyph, useCurrency } from '@foundation/currency';
import { Avatar } from '@ui/Avatar';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { Icon } from '@ui/Icon';
import { IconButton } from '@ui/IconButton';
import { Money } from '@ui/Money';
import { Pill } from '@ui/Pill';
import { Text } from '@ui/Text';
import { TextField } from '@ui/TextField';
import { URGENT_DEEP } from '@ui/tokens';

export interface ScanReconcileLine {
  readonly key: string;
  readonly displayName: string;
  readonly category: string;
  readonly quantity: number;
  readonly unit: string;
  readonly lastUnitCost: number | null;
  readonly recognised: boolean;
}

export interface ScanReconcileProps {
  readonly storeName: string | null;
  readonly lines: ScanReconcileLine[];
  readonly total: number;
  readonly attributionUserId: string;
  readonly overCapAddCount: number | null;
  readonly submitting: boolean;
  readonly error: string | null;
  readonly onChangeName: (key: string, name: string) => void;
  readonly onSettleName: (key: string) => void;
  readonly onDelete: (key: string) => void;
  readonly onConfirm: () => void;
}

export function ScanReconcile({
  storeName,
  lines,
  total,
  attributionUserId,
  overCapAddCount,
  submitting,
  error,
  onChangeName,
  onSettleName,
  onDelete,
  onConfirm,
}: ScanReconcileProps) {
  const recognised = lines.filter((line) => line.recognised).length;
  const canConfirm =
    lines.length > 0 && lines.every((line) => line.displayName.trim() !== '') && !submitting;
  const itemWord = lines.length === 1 ? 'item' : 'items';
  const glyph = currencyGlyph(useCurrency());

  return (
    <View className="flex-1">
      <View className="px-4 pb-2 pt-3" accessibilityLiveRegion="polite">
        <Text variant="title">{banner(recognised, lines.length, storeName)}</Text>
      </View>
      <ScrollView contentContainerClassName="gap-3 px-4 pb-4">
        <Card>
          {lines.map((line, index) => (
            <Row
              key={line.key}
              line={line}
              last={index === lines.length - 1}
              onChangeName={onChangeName}
              onSettleName={onSettleName}
              onDelete={onDelete}
              glyph={glyph}
            />
          ))}
        </Card>

        {overCapAddCount !== null ? (
          <Text variant="meta" tone="urgent" accessibilityLiveRegion="polite">
            {`Adding these would pass your free limit of 50. ${overCapAddCount} will be added.`}
          </Text>
        ) : null}

        <Card padding="md">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Avatar userId={attributionUserId} size={20} />
              <Text variant="meta" tone="mid">
                Logged to you
              </Text>
            </View>
            <Money value={total} big />
          </View>
        </Card>

        {error !== null ? (
          <Text variant="meta" tone="urgent" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button
          label={`Add ${lines.length} ${itemWord} to pantry`}
          kind="accent"
          size="lg"
          full
          disabled={!canConfirm}
          onPress={onConfirm}
        />
      </ScrollView>
    </View>
  );
}

function Row({
  line,
  last,
  onChangeName,
  onSettleName,
  onDelete,
  glyph,
}: {
  readonly line: ScanReconcileLine;
  readonly last: boolean;
  readonly onChangeName: (key: string, name: string) => void;
  readonly onSettleName: (key: string) => void;
  readonly onDelete: (key: string) => void;
  readonly glyph: string;
}) {
  return (
    <View
      className={`gap-1 px-3 py-2 ${line.recognised ? '' : 'bg-urgency-urgent-bg'} ${
        last ? '' : 'border-b border-hairline'
      }`}
    >
      <View className="flex-row items-center gap-2">
        {line.recognised ? (
          <Text
            variant="body-strong"
            className="flex-1"
            numberOfLines={1}
            accessibilityLabel={lineLabel(line, glyph)}
          >
            {line.displayName}
          </Text>
        ) : (
          <View className="flex-1 flex-row items-center gap-1">
            <Icon icon={Pencil} accessibilityLabel="" size={14} color={URGENT_DEEP} />
            <TextField
              value={line.displayName}
              onChangeText={(text) => onChangeName(line.key, text)}
              onBlur={() => onSettleName(line.key)}
              placeholder="Name this item"
              className="flex-1"
              accessibilityLabel="Fix item name"
            />
          </View>
        )}
        <Text variant="meta" tone="mid" maxFontSizeMultiplier={1.3}>
          {`${formatQty(line.quantity)} ${line.unit}`}
        </Text>
        {line.lastUnitCost !== null ? (
          <Money value={line.lastUnitCost} />
        ) : (
          <Text variant="meta" tone="muted" maxFontSizeMultiplier={1.3}>
            —
          </Text>
        )}
        <IconButton
          icon={Trash2}
          onPress={() => onDelete(line.key)}
          accessibilityLabel={`Remove ${line.displayName || 'item'}`}
          tone="ghost"
          size={36}
        />
      </View>
      <View className="flex-row items-center gap-2">
        <Pill tone="mute">
          <Text variant="eyebrow" tone="mid">
            {line.category}
          </Text>
        </Pill>
        {!line.recognised ? (
          <Text variant="meta" tone="urgent">
            needs fixing
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function banner(recognised: number, total: number, storeName: string | null): string {
  const at = storeName !== null ? ` at ${storeName}` : '';
  if (total === 0) return 'No items to add.';
  if (recognised === 0) return `Couldn't match these to your pantry. Fix them, or add by hand.`;
  if (recognised === total) {
    const word = total === 1 ? 'item' : 'items';
    return `All ${total} ${word} recognised${at}.`;
  }
  return `${recognised} of ${total} recognised${at}. Fix the flagged lines.`;
}

function formatQty(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)));
}

function lineLabel(line: ScanReconcileLine, glyph: string): string {
  const price = line.lastUnitCost !== null ? `${glyph}${line.lastUnitCost.toFixed(2)}` : 'no price';
  return `${line.displayName}, ${formatQty(line.quantity)} ${line.unit}, ${price}, recognised`;
}
