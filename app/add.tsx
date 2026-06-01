// / add to pantry sheet
import { Camera, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { receiptCapReached } from '@domain/use-cases/receipt';
import { receiptService } from '@domain/use-cases/receipt/service';
import { useEntitlements, useUser } from '@foundation/context';
import { Icon } from '@ui/Icon';
import { Sheet } from '@ui/Sheet';
import { Text } from '@ui/Text';
import { INK, MUTED, TERRACOTTA } from '@ui/tokens';

export default function AddScreen() {
  const user = useUser();
  const entitlements = useEntitlements();
  const householdId = user?.household_id ?? null;
  const [capped, setCapped] = useState(false);

  useEffect(() => {
    let active = true;
    if (householdId === null) return;
    void receiptService.countThisMonth(householdId).then(
      (count) => {
        if (active) setCapped(receiptCapReached(count, entitlements.receipts_per_month));
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [householdId, entitlements]);

  return (
    <Sheet title="Add to pantry" onClose={() => router.back()}>
      {capped ? (
        <View
          className="flex-row items-center gap-3 rounded-2 border border-hairline bg-surface px-4"
          style={{ minHeight: 56 }}
        >
          <Icon icon={Camera} accessibilityLabel="" size={20} color={MUTED} />
          <View className="flex-1">
            <Text variant="body-strong" tone="mid">
              Scan a receipt
            </Text>
            <Text variant="meta" tone="muted">
              {`You've used your ${entitlements.receipts_per_month} scans this month.`}
            </Text>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => router.replace('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Scan a receipt"
          className="flex-row items-center gap-3 rounded-2 border border-terracotta-soft bg-terracotta-bg px-4"
          style={{ minHeight: 56 }}
        >
          <Icon icon={Camera} accessibilityLabel="" size={20} color={TERRACOTTA} />
          <View className="flex-1">
            <Text variant="body-strong">Scan a receipt</Text>
            <Text variant="meta" tone="mid">
              Snap it to fill your pantry.
            </Text>
          </View>
        </Pressable>
      )}
      <Pressable
        onPress={() => router.replace('/add-item')}
        accessibilityRole="button"
        accessibilityLabel="Add by hand"
        className="flex-row items-center gap-3 rounded-2 border border-hairline bg-surface px-4"
        style={{ minHeight: 56 }}
      >
        <Icon icon={Plus} accessibilityLabel="" size={20} color={INK} />
        <View className="flex-1">
          <Text variant="body-strong">Add by hand</Text>
          <Text variant="meta" tone="mid">
            Enter an item yourself.
          </Text>
        </View>
      </Pressable>
    </Sheet>
  );
}
