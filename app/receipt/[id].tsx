// / receipt detail sheet
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { receiptDateLabel } from '@/components/spending/ReceiptRow';
import { receiptService, type ReceiptWithLines } from '@domain/use-cases/receipt/service';
import { currencyGlyph, useCurrency } from '@foundation/currency';
import { Avatar } from '@ui/Avatar';
import { Money } from '@ui/Money';
import { Sheet } from '@ui/Sheet';
import { Text } from '@ui/Text';

export default function ReceiptDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const receiptId = typeof params.id === 'string' ? params.id : null;
  const glyph = currencyGlyph(useCurrency());

  const [detail, setDetail] = useState<ReceiptWithLines | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (receiptId === null) return;
    let cancelled = false;
    receiptService
      .get(receiptId)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded === null) {
          setError("Couldn't find this receipt.");
        } else {
          setDetail(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this receipt. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  const receipt = detail?.receipt ?? null;
  const lines = detail?.lineItems ?? [];
  const added = lines.filter((line) => line.pantryItemId !== null).length;

  return (
    <Sheet title={receipt?.storeName ?? 'Receipt'} onClose={() => router.back()}>
      {error !== null ? (
        <Text variant="meta" tone="urgent" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : receipt === null ? (
        <View className="gap-2">
          <View className="h-6 rounded-2 bg-surface-mute" />
          <View className="h-6 rounded-2 bg-surface-mute" />
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-2">
            <Avatar userId={receipt.scannedByUserId} size={18} />
            <Text variant="meta" tone="mid">
              {receiptDateLabel(receipt.purchasedAt)}
            </Text>
          </View>
          {receipt.ocrStatus === 'pending' ? (
            <Text variant="body" tone="mid">
              Still processing.
            </Text>
          ) : receipt.ocrStatus === 'failed' ? (
            <Text variant="body" tone="mid">
              {"Couldn't read this receipt."}
            </Text>
          ) : (
            <>
              <View className="flex-row items-baseline justify-between">
                <Text variant="label">Total</Text>
                <View className="flex-row items-baseline gap-2">
                  {receipt.taxAmount !== null ? (
                    <Text variant="meta" tone="mid">
                      {`incl. ${glyph}${receipt.taxAmount.toFixed(2)} tax`}
                    </Text>
                  ) : null}
                  <Money value={receipt.totalAmount} big />
                </View>
              </View>
              {lines.length > 0 ? (
                <ScrollView style={{ maxHeight: 360 }}>
                  <View className="overflow-hidden rounded-3 border border-hairline">
                    {lines.map((line, index) => (
                      <View
                        key={line.id}
                        className={`flex-row items-center justify-between bg-surface px-3 py-2 ${
                          index === 0 ? '' : 'border-t border-hairline'
                        }`}
                      >
                        <View className="flex-1 pr-3">
                          <Text variant="body">{line.canonicalName ?? line.rawText}</Text>
                          {line.quantity !== null && line.unitPrice !== null ? (
                            <Text variant="meta" tone="mid">
                              {`${line.quantity} × ${glyph}${line.unitPrice.toFixed(2)}`}
                            </Text>
                          ) : null}
                        </View>
                        <Money value={line.lineTotal} />
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : null}
              {added > 0 ? (
                <Text variant="meta" tone="mid">
                  {`${added} of ${lines.length} items added to your pantry.`}
                </Text>
              ) : null}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
