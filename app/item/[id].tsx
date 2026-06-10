// / pantry item detail sheet
import { Snowflake, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import type { PantryItem } from '@domain/entities/pantry-item';
import { pantryService } from '@domain/use-cases/pantry/service';
import { useUser } from '@foundation/context';
import { Button } from '@ui/Button';
import { Eyebrow } from '@ui/Eyebrow';
import { Icon } from '@ui/Icon';
import { Sheet } from '@ui/Sheet';
import { Stepper } from '@ui/Stepper';
import { Text } from '@ui/Text';
import { MID } from '@ui/tokens';

export default function ItemDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const user = useUser();
  const householdId = user?.household_id ?? null;
  const userId = user?.id ?? '';

  const [item, setItem] = useState<PantryItem | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (householdId === null || id === '') {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const found = await pantryService.get(id, householdId);
        if (!active) return;
        setItem(found);
        if (found !== null) {
          setQuantity(found.quantity);
          setIsFrozen(found.isFrozen);
        }
      } catch {
        if (active) setError("Couldn't load this item.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, householdId]);

  const close = (): void => router.back();

  async function save(): Promise<void> {
    if (householdId === null || item === null || saving) return;
    setSaving(true);
    setError(null);
    try {
      await pantryService.update({ id: item.id, householdId, userId, quantity, isFrozen });
      router.back();
    } catch {
      setSaving(false);
      setError("Couldn't save. Try again.");
    }
  }

  function confirmRemove(): void {
    if (item === null) return;
    Alert.alert(`Remove ${item.displayName}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void remove() },
    ]);
  }

  async function remove(): Promise<void> {
    if (householdId === null || item === null) return;
    try {
      await pantryService.remove({ id: item.id, householdId, userId });
      router.back();
    } catch {
      setError("Couldn't remove. Try again.");
    }
  }

  return (
    <Sheet title={item?.displayName ?? 'Item'} onClose={close}>
      {loading ? (
        <Text variant="body" tone="mid">
          Loading…
        </Text>
      ) : item === null ? (
        <Text variant="body" tone="mid">
          This item is no longer in your pantry.
        </Text>
      ) : (
        <>
          <Text variant="meta" tone="muted">
            {item.category}
          </Text>

          <View className="gap-2">
            <Eyebrow>Quantity</Eyebrow>
            <View className="flex-row items-center gap-3">
              <Stepper value={quantity} onChange={setQuantity} />
              <Text variant="meta" tone="muted">
                {item.unit}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setIsFrozen((value) => !value)}
            accessibilityRole="switch"
            accessibilityState={{ checked: isFrozen }}
            accessibilityLabel="Frozen"
            className="flex-row items-center justify-between rounded-2 border border-hairline bg-surface px-3"
            style={{ minHeight: 44 }}
          >
            <View className="flex-row items-center gap-2">
              <Icon icon={Snowflake} accessibilityLabel="" size={18} color={MID} />
              <Text variant="body">Frozen</Text>
            </View>
            <View
              className={`h-6 w-10 justify-center rounded-pill px-[2px] ${
                isFrozen ? 'bg-urgency-frozen' : 'bg-edge'
              }`}
            >
              <View
                className={`h-5 w-5 rounded-pill bg-surface-2 ${
                  isFrozen ? 'self-end' : 'self-start'
                }`}
              />
            </View>
          </Pressable>

          {error !== null ? (
            <Text variant="meta" tone="urgent" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Button
            label="Save"
            kind="accent"
            size="lg"
            full
            disabled={saving}
            onPress={() => void save()}
          />
          <Button label="Remove from pantry" kind="danger" icon={Trash2} onPress={confirmRemove} />
        </>
      )}
    </Sheet>
  );
}
