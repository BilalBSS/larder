// / spending dashboard screen
import { Fragment } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { CategoryDonut } from '@/components/spending/CategoryDonut';
import { HeroCard } from '@/components/spending/HeroCard';
import { MemberBreakdown } from '@/components/spending/MemberBreakdown';
import { ReceiptRow } from '@/components/spending/ReceiptRow';
import { ScopeToggle } from '@/components/spending/ScopeToggle';
import { StoreList } from '@/components/spending/StoreList';
import { TrendChart } from '@/components/spending/TrendChart';
import { useSpending } from '@/components/spending/useSpending';
import type { Receipt } from '@domain/entities/receipt';
import { useUser } from '@foundation/context';
import { currencyGlyph, useCurrency } from '@foundation/currency';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { Eyebrow } from '@ui/Eyebrow';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';
import { TopBar } from '@ui/TopBar';

export default function SpendingScreen() {
  const user = useUser();
  const householdId = user?.household_id ?? null;
  const userId = user?.id ?? '';
  const glyph = currencyGlyph(useCurrency());
  const { vm, scope, setScope, loading, error, reload } = useSpending({ householdId, userId });

  if (householdId === null) {
    return (
      <Screen edges={['top']} className="items-center justify-center px-8">
        <Text variant="title" className="text-center">
          No household yet.
        </Text>
        <Text variant="body" tone="mid" className="mt-2 text-center">
          Create or join a household to track spending.
        </Text>
      </Screen>
    );
  }

  const openReceipt = (receipt: Receipt): void => router.push(`/receipt/${receipt.id}`);

  return (
    <Screen edges={['top']}>
      <TopBar
        eyebrow={vm?.topEyebrow ?? 'This month'}
        title="Spending"
        sub="What your food actually costs."
      />
      <ScrollView contentContainerClassName="gap-3 px-4 pb-[96px]">
        {error !== null ? (
          <View
            accessibilityLiveRegion="polite"
            className="flex-row items-center justify-between gap-3"
          >
            <Text variant="meta" tone="urgent" className="flex-1">
              Could not load your spending. Check your connection.
            </Text>
            <Button label="Retry" kind="ghost" size="sm" onPress={reload} />
          </View>
        ) : null}
        {vm === null ? (
          loading ? (
            <SpendingSkeleton />
          ) : null
        ) : vm.noReceipts ? (
          <EmptySpending />
        ) : (
          <>
            <ScopeToggle value={scope} onChange={setScope} />
            <HeroCard hero={vm.hero} glyph={glyph} onEditBudget={() => router.push('/budget')} />
            {vm.members.visible ? (
              <MemberBreakdown
                members={vm.members}
                glyph={glyph}
                onSettleUp={() => router.push('/settle-up')}
              />
            ) : null}
            {vm.trend.visible ? (
              <Fragment>
                <SectionEyebrow title="Last 6 months" />
                <TrendChart buckets={vm.trend.buckets} glyph={glyph} />
              </Fragment>
            ) : null}
            {vm.categories.visible ? (
              <Fragment>
                <SectionEyebrow title="By category" />
                <CategoryDonut breakdown={vm.categories.breakdown} glyph={glyph} />
              </Fragment>
            ) : null}
            {vm.stores.visible ? (
              <Fragment>
                <SectionEyebrow title="By store" onSeeAll={() => router.push('/receipts')} />
                <StoreList rows={vm.stores.rows} glyph={glyph} />
              </Fragment>
            ) : null}
            {vm.recent.length > 0 ? (
              <Fragment>
                <SectionEyebrow title="Recent receipts" onSeeAll={() => router.push('/receipts')} />
                <Card padding="none">
                  {vm.recent.map((receipt, index) => (
                    <ReceiptRow
                      key={receipt.id}
                      receipt={receipt}
                      first={index === 0}
                      onPress={openReceipt}
                    />
                  ))}
                </Card>
              </Fragment>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function SectionEyebrow({
  title,
  onSeeAll,
}: {
  readonly title: string;
  readonly onSeeAll?: () => void;
}) {
  return (
    <View className="mt-2 flex-row items-center justify-between px-1">
      <Eyebrow>{title}</Eyebrow>
      {onSeeAll !== undefined ? (
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel="See all receipts"
        >
          <Text variant="meta" tone="terracotta">
            {'See all ›'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptySpending() {
  return (
    <View className="items-center px-4 py-16">
      <Text variant="display-lg" className="text-center">
        No spending yet.
      </Text>
      <Text variant="body" tone="mid" className="mt-2 text-center">
        Scan a receipt and Larder tracks every penny — who paid, where, on what.
      </Text>
      <View className="mt-5 items-center gap-3">
        <Button kind="accent" label="Scan a receipt" onPress={() => router.push('/scan')} />
        <Button
          kind="ghost"
          size="sm"
          label="Set a budget"
          onPress={() => router.push('/budget')}
        />
      </View>
    </View>
  );
}

function SpendingSkeleton() {
  return (
    <View className="gap-3">
      <View className="h-8 rounded-pill bg-surface-mute" />
      <View className="h-28 rounded-3 bg-surface-mute" />
      <View className="h-40 rounded-3 bg-surface-mute" />
      <View className="h-32 rounded-3 bg-surface-mute" />
    </View>
  );
}
