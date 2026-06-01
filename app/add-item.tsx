// / add pantry item
import { X } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { PantryCapError } from '@domain/use-cases/pantry';
import { pantryService } from '@domain/use-cases/pantry/service';
import { useEntitlements, useUser } from '@foundation/context';
import { currencyGlyph, useCurrency } from '@foundation/currency';
import { Button } from '@ui/Button';
import { Eyebrow } from '@ui/Eyebrow';
import { IconButton } from '@ui/IconButton';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';
import { TextField } from '@ui/TextField';
import { TopBar } from '@ui/TopBar';

export default function AddItemScreen() {
  const user = useUser();
  const entitlements = useEntitlements();
  const householdId = user?.household_id ?? null;
  const userId = user?.id ?? '';
  const glyph = currencyGlyph(useCurrency());

  const [displayName, setDisplayName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [lastCost, setLastCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookedUpRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  if (householdId === null) {
    return (
      <Screen className="items-center justify-center px-8">
        <Text variant="title" className="text-center">
          No household yet.
        </Text>
      </Screen>
    );
  }

  const canSubmit =
    displayName.trim() !== '' && unit.trim() !== '' && isValidQuantity(quantity) && !capReached;

  async function onNameSettle(): Promise<void> {
    const name = displayName.trim();
    if (name === '' || name === lookedUpRef.current) return;
    lookedUpRef.current = name;
    const match = await pantryService.lookup(name);
    if (match !== null) {
      setCategory(match.category);
      if (match.defaultExpirationDays !== null)
        setExpiresInDays(String(match.defaultExpirationDays));
    } else if (category.trim() === '') {
      setCategory('other');
    }
  }

  async function submit(): Promise<void> {
    if (householdId === null || submittingRef.current || !canSubmit) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await pantryService.add(
        {
          householdId,
          userId,
          displayName: displayName.trim(),
          category: category.trim() === '' ? 'other' : category.trim(),
          quantity: Number(quantity),
          unit: unit.trim(),
          estimatedExpirationDays: parseOptionalNumber(expiresInDays),
          lastPurchasedAt: new Date().toISOString(),
          lastUnitCost: parseOptionalNumber(lastCost),
        },
        entitlements,
      );
      router.back();
    } catch (caught) {
      submittingRef.current = false;
      setSubmitting(false);
      if (caught instanceof PantryCapError) {
        setCapReached(true);
      } else {
        setError('Could not add the item. Try again.');
      }
    }
  }

  return (
    <Screen>
      <TopBar
        title="Add item"
        leading={
          <IconButton
            icon={X}
            onPress={() => router.back()}
            accessibilityLabel="Close"
            tone="ghost"
          />
        }
      />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-10" keyboardShouldPersistTaps="handled">
        <Field label="Item name">
          <TextField
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={() => void onNameSettle()}
            placeholder="Bananas"
            autoFocus
            accessibilityLabel="Item name"
          />
        </Field>

        <View className="flex-row gap-3">
          <Field label="Quantity" className="flex-1">
            <TextField
              value={quantity}
              onChangeText={setQuantity}
              placeholder="6"
              keyboardType="decimal-pad"
              accessibilityLabel="Quantity"
            />
          </Field>
          <Field label="Unit" className="flex-1">
            <TextField
              value={unit}
              onChangeText={setUnit}
              placeholder="count"
              autoCapitalize="none"
              accessibilityLabel="Unit"
            />
          </Field>
        </View>

        <Field label="Category">
          <TextField
            value={category}
            onChangeText={setCategory}
            placeholder="produce"
            autoCapitalize="none"
            accessibilityLabel="Category"
          />
        </Field>

        <View className="flex-row gap-3">
          <Field label="Expires in (days)" className="flex-1">
            <TextField
              value={expiresInDays}
              onChangeText={setExpiresInDays}
              placeholder="7"
              keyboardType="number-pad"
              accessibilityLabel="Expires in days"
            />
          </Field>
          <Field label={`Cost each (${glyph})`} className="flex-1">
            <TextField
              value={lastCost}
              onChangeText={setLastCost}
              placeholder="1.50"
              keyboardType="decimal-pad"
              accessibilityLabel="Cost each"
            />
          </Field>
        </View>

        {capReached ? (
          <View
            accessibilityLiveRegion="polite"
            className="rounded-2 border border-edge bg-surface-mute p-3"
          >
            <Text variant="meta" tone="ink">
              You&apos;ve reached the free limit of 50 items. Remove something to add more.
            </Text>
          </View>
        ) : null}

        {error !== null ? (
          <Text variant="meta" tone="urgent" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button
          label="Add to pantry"
          kind="accent"
          size="lg"
          full
          disabled={!canSubmit || submitting}
          onPress={() => void submit()}
        />
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  children,
  className,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <Eyebrow>{label}</Eyebrow>
      {children}
    </View>
  );
}

function isValidQuantity(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === '') return false;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0;
}

function parseOptionalNumber(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}
