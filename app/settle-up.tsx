// / settle up sheet
import { ArrowRight } from 'lucide-react-native';
import { Fragment, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import type { DashboardData } from '@domain/use-cases/spending/get-dashboard';
import { spendingService } from '@domain/use-cases/spending/service';
import {
  buildSpendingViewModel,
  memberLabel,
  type SettleVM,
} from '@domain/use-cases/spending/view-model';
import { useUser } from '@foundation/context';
import { currencyGlyph, useCurrency } from '@foundation/currency';
import { Avatar } from '@ui/Avatar';
import { Eyebrow } from '@ui/Eyebrow';
import { Icon } from '@ui/Icon';
import { Money } from '@ui/Money';
import { Sheet } from '@ui/Sheet';
import { Text } from '@ui/Text';
import { MID } from '@ui/tokens';

export default function SettleUpScreen() {
  const user = useUser();
  const householdId = user?.household_id ?? null;
  const userId = user?.id ?? '';
  const glyph = currencyGlyph(useCurrency());

  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (householdId === null) return;
    let cancelled = false;
    spendingService
      .dashboard(householdId, userId)
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the split. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, userId]);

  const settles =
    data === null ? [] : buildSpendingViewModel(data, 'household', userId, glyph).members.settles;

  return (
    <Sheet title="Settle up" onClose={() => router.back()}>
      {error !== null ? (
        <Text variant="meta" tone="urgent" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : data === null ? (
        <View className="gap-2">
          <View className="h-6 rounded-2 bg-surface-mute" />
          <View className="h-6 rounded-2 bg-surface-mute" />
        </View>
      ) : settles.length === 0 ? (
        <Text variant="body" tone="mid">
          {"Everyone's even this month."}
        </Text>
      ) : (
        settles.map((settle) => (
          <SettleSection key={settle.monthLabel} settle={settle} data={data} selfId={userId} />
        ))
      )}
    </Sheet>
  );
}

function SettleSection({
  settle,
  data,
  selfId,
}: {
  readonly settle: SettleVM;
  readonly data: DashboardData;
  readonly selfId: string;
}) {
  return (
    <Fragment>
      <View className="flex-row items-baseline justify-between">
        <Eyebrow>{settle.monthLabel}</Eyebrow>
        <Text variant="meta" tone="mid">
          {`Split evenly across ${settle.settlement.splitCount} members`}
        </Text>
      </View>
      <View className="overflow-hidden rounded-3 border border-hairline">
        {settle.settlement.transfers.map((transfer, index) => (
          <View
            key={`${transfer.fromUserId}-${transfer.toUserId}`}
            className={`flex-row items-center gap-2 bg-surface px-3 py-3 ${
              index === 0 ? '' : 'border-t border-hairline'
            }`}
          >
            <Avatar userId={transfer.fromUserId} size={18} />
            <Text variant="body-strong">
              {memberLabel(transfer.fromUserId, selfId, data.householdType)}
            </Text>
            <Icon icon={ArrowRight} accessibilityLabel="owes" size={14} color={MID} />
            <Avatar userId={transfer.toUserId} size={18} />
            <Text variant="body-strong" className="flex-1">
              {memberLabel(transfer.toUserId, selfId, data.householdType)}
            </Text>
            <Money value={transfer.amount} />
          </View>
        ))}
      </View>
    </Fragment>
  );
}
