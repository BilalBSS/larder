// / currency picker sheet
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { householdService } from '@domain/use-cases/household/service';
import { useRefreshUser, useUser } from '@foundation/context';
import { CURRENCY_OPTIONS, currencyGlyph, useCurrency } from '@foundation/currency';
import { Icon } from '@ui/Icon';
import { Sheet } from '@ui/Sheet';
import { Text } from '@ui/Text';
import { INK } from '@ui/tokens';

export default function CurrencyScreen() {
  const user = useUser();
  const refresh = useRefreshUser();
  const current = useCurrency();
  const householdId = user?.household_id ?? null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(code: string): Promise<void> {
    if (householdId === null || saving) return;
    if (code === current) {
      router.back();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await householdService.setCurrency(householdId, code);
      await refresh();
      router.back();
    } catch {
      setSaving(false);
      setError("Couldn't update currency. Try again.");
    }
  }

  return (
    <Sheet title="Currency" onClose={() => router.back()}>
      <View className="overflow-hidden rounded-3 border border-hairline">
        {CURRENCY_OPTIONS.map((option, index) => (
          <Pressable
            key={option.code}
            onPress={() => void choose(option.code)}
            accessibilityRole="button"
            accessibilityState={{ selected: option.code === current }}
            accessibilityLabel={option.label}
            className={`flex-row items-center justify-between bg-surface px-4 ${
              index === 0 ? '' : 'border-t border-hairline'
            }`}
            style={{ minHeight: 52 }}
          >
            <View className="flex-row items-center gap-3">
              <Text variant="num" tone="mid" className="w-5">
                {currencyGlyph(option.code)}
              </Text>
              <Text variant="body">{option.label}</Text>
            </View>
            {option.code === current ? (
              <Icon icon={Check} accessibilityLabel="" size={18} color={INK} />
            ) : null}
          </Pressable>
        ))}
      </View>
      {error !== null ? (
        <Text variant="meta" tone="urgent" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </Sheet>
  );
}
