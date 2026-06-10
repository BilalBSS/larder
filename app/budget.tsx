// / budget editor sheet
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { spendingService, type HouseholdBudgets } from '@domain/use-cases/spending/service';
import { useUser } from '@foundation/context';
import { currencyGlyph, useCurrency } from '@foundation/currency';
import { Button } from '@ui/Button';
import { Sheet } from '@ui/Sheet';
import { Text } from '@ui/Text';
import { TextField } from '@ui/TextField';

function asInput(limit: number | undefined): string {
  return limit === undefined ? '' : `${limit}`;
}

function parseLimit(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function BudgetScreen() {
  const user = useUser();
  const householdId = user?.household_id ?? null;
  const userId = user?.id ?? '';
  const glyph = currencyGlyph(useCurrency());

  const [budgets, setBudgets] = useState<HouseholdBudgets | null>(null);
  const [householdValue, setHouseholdValue] = useState('');
  const [personalValue, setPersonalValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (householdId === null) return;
    let cancelled = false;
    spendingService
      .budgets(householdId, userId)
      .then((loaded) => {
        if (cancelled) return;
        setBudgets(loaded);
        setHouseholdValue(asInput(loaded.household?.monthlyLimit));
        setPersonalValue(asInput(loaded.personal?.monthlyLimit));
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load budgets. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, userId]);

  async function save(): Promise<void> {
    if (householdId === null || budgets === null || savingRef.current) return;
    const household = parseLimit(householdValue);
    const personal = parseLimit(personalValue);
    if ((household !== null && !(household > 0)) || (personal !== null && !(personal > 0))) {
      setError('Enter an amount above zero.');
      return;
    }
    savingRef.current = true;
    setError(null);
    try {
      const base = { householdId, userId };
      if (household === null && budgets.household !== null) {
        await spendingService.clearBudget({ ...base, target: 'household' });
      } else if (household !== null && household !== budgets.household?.monthlyLimit) {
        await spendingService.setBudget({ ...base, target: 'household' }, household);
      }
      if (personal === null && budgets.personal !== null) {
        await spendingService.clearBudget({ ...base, target: 'personal' });
      } else if (personal !== null && personal !== budgets.personal?.monthlyLimit) {
        await spendingService.setBudget({ ...base, target: 'personal' }, personal);
      }
      router.back();
    } catch {
      savingRef.current = false;
      setError("Couldn't save the budget. Try again.");
    }
  }

  return (
    <Sheet title="Budget" onClose={() => router.back()}>
      <View className="gap-1">
        <Text variant="label">Household budget</Text>
        <View className="flex-row items-center gap-2">
          <Text variant="num" tone="mid" className="w-4">
            {glyph}
          </Text>
          <TextField
            value={householdValue}
            onChangeText={setHouseholdValue}
            keyboardType="decimal-pad"
            placeholder="0"
            accessibilityLabel="Household budget amount"
            className="flex-1"
          />
        </View>
      </View>
      <View className="gap-1">
        <Text variant="label">Your personal cap</Text>
        <View className="flex-row items-center gap-2">
          <Text variant="num" tone="mid" className="w-4">
            {glyph}
          </Text>
          <TextField
            value={personalValue}
            onChangeText={setPersonalValue}
            keyboardType="decimal-pad"
            placeholder="0"
            accessibilityLabel="Personal cap amount"
            className="flex-1"
          />
        </View>
      </View>
      <Text variant="meta" tone="mid">
        Leave a field empty to remove that budget.
      </Text>
      {error !== null ? (
        <Text variant="meta" tone="urgent" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button
        kind="accent"
        label="Save"
        full
        disabled={budgets === null}
        onPress={() => void save()}
      />
    </Sheet>
  );
}
