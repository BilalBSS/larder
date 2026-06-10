// / receipt history screen
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';

import { ReceiptRow } from '@/components/spending/ReceiptRow';
import type { Receipt } from '@domain/entities/receipt';
import { receiptService } from '@domain/use-cases/receipt/service';
import { useUser } from '@foundation/context';
import { IconButton } from '@ui/IconButton';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';
import { TopBar } from '@ui/TopBar';

const HISTORY_LIMIT = 100;

export default function ReceiptsScreen() {
  const user = useUser();
  const householdId = user?.household_id ?? null;
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (householdId === null) return;
    let cancelled = false;
    receiptService
      .list(householdId, HISTORY_LIMIT)
      .then((loaded) => {
        if (!cancelled) setReceipts(loaded);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load receipts. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  return (
    <Screen edges={['top']}>
      <TopBar
        eyebrow="Every scan"
        title="Receipts"
        sub="Newest first."
        leading={
          <IconButton
            icon={ChevronLeft}
            onPress={() => router.back()}
            accessibilityLabel="Back"
            tone="ghost"
          />
        }
      />
      {error !== null ? (
        <Text variant="meta" tone="urgent" className="px-4" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : receipts === null ? (
        <View className="gap-2 px-4">
          <View className="h-12 rounded-3 bg-surface-mute" />
          <View className="h-12 rounded-3 bg-surface-mute" />
          <View className="h-12 rounded-3 bg-surface-mute" />
        </View>
      ) : receipts.length === 0 ? (
        <Text variant="body" tone="mid" className="px-4 py-8 text-center">
          No receipts yet.
        </Text>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(receipt) => receipt.id}
          contentContainerClassName="px-4 pb-8"
          renderItem={({ item, index }) => (
            <ReceiptRow
              receipt={item}
              first={index === 0}
              onPress={(target) => router.push(`/receipt/${target.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}
