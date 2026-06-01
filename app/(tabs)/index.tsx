// / pantry inventory screen
import { Archive, MoreHorizontal, Plus, Search } from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { FilterChips, type PantryFilter } from '@/components/pantry/FilterChips';
import { GlanceBar } from '@/components/pantry/GlanceBar';
import { PantryRow } from '@/components/pantry/PantryRow';
import { usePantry } from '@/components/pantry/usePantry';
import { groupByUrgency } from '@domain/entities/group-pantry';
import { atRiskValue, countUseFirst } from '@domain/entities/pantry-stats';
import { useUser } from '@foundation/context';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { Eyebrow } from '@ui/Eyebrow';
import { FAB } from '@ui/FAB';
import { Icon } from '@ui/Icon';
import { IconButton } from '@ui/IconButton';
import { Screen } from '@ui/Screen';
import { Text } from '@ui/Text';
import { TERRACOTTA } from '@ui/tokens';
import { TopBar } from '@ui/TopBar';

export default function PantryScreen() {
  const user = useUser();
  const householdId = user?.household_id ?? null;
  const userId = user?.id ?? '';
  const { items, loading, error, loadedAt, remove, reload } = usePantry({ householdId, userId });
  const [filter, setFilter] = useState<PantryFilter>('all');

  const sections = useMemo(() => groupByUrgency(items, loadedAt), [items, loadedAt]);
  const atRisk = useMemo(() => atRiskValue(items, loadedAt), [items, loadedAt]);
  const useFirst = useMemo(() => countUseFirst(sections), [sections]);

  if (householdId === null) {
    return (
      <Screen edges={['top']} className="items-center justify-center px-8">
        <Text variant="title" className="text-center">
          No household yet.
        </Text>
        <Text variant="body" tone="mid" className="mt-2 text-center">
          Create or join a household to stock your pantry.
        </Text>
      </Screen>
    );
  }

  const goAdd = (): void => router.push('/add-item');
  const visible =
    filter === 'all' ? sections : sections.filter((section) => section.key === filter);
  const isEmpty = items.length === 0;
  const itemWord = items.length === 1 ? 'item' : 'items';

  return (
    <Screen edges={['top']}>
      <TopBar
        eyebrow="Your kitchen"
        title="Pantry"
        sub={isEmpty ? 'Nothing stocked yet.' : `${items.length} ${itemWord}`}
        trailing={
          <>
            <IconButton
              icon={Search}
              onPress={noop}
              accessibilityLabel="Search pantry"
              tone="ghost"
            />
            <IconButton
              icon={MoreHorizontal}
              onPress={noop}
              accessibilityLabel="More options"
              tone="ghost"
            />
          </>
        }
      />
      {/* / scrollview ok under 80 */}
      <ScrollView contentContainerClassName="gap-3 px-4 pb-[96px]">
        {!isEmpty ? (
          <GlanceBar atRisk={atRisk} useFirst={useFirst} onUseFirst={() => setFilter('urgent')} />
        ) : null}
        {!isEmpty ? <FilterChips value={filter} onChange={setFilter} sections={sections} /> : null}
        {error !== null ? (
          <View
            accessibilityLiveRegion="polite"
            className="flex-row items-center justify-between gap-3"
          >
            <Text variant="meta" tone="urgent" className="flex-1">
              Could not load your pantry. Check your connection.
            </Text>
            <Button label="Retry" kind="ghost" size="sm" onPress={reload} />
          </View>
        ) : null}
        {loading && isEmpty ? (
          <PantrySkeleton />
        ) : isEmpty ? (
          <EmptyPantry onAdd={goAdd} />
        ) : visible.length === 0 ? (
          <View className="items-center px-4 py-16">
            <Text variant="title" className="text-center">
              Nothing here.
            </Text>
            <Text variant="body" tone="mid" className="mt-2 text-center">
              Try another filter.
            </Text>
          </View>
        ) : (
          <Card>
            <ColumnHeader />
            {visible.map((section, sectionIndex) => (
              <Fragment key={section.key}>
                <SectionBar title={section.title} first={sectionIndex === 0} />
                {section.items.map((item, itemIndex) => (
                  <PantryRow
                    key={item.id}
                    item={item}
                    now={loadedAt}
                    onPress={(target) => router.push(`/item/${target.id}`)}
                    onRemove={remove}
                    last={itemIndex === section.items.length - 1}
                  />
                ))}
              </Fragment>
            ))}
          </Card>
        )}
      </ScrollView>
      <FAB onPress={() => router.push('/add')} accessibilityLabel="Add to pantry" />
    </Screen>
  );
}

function ColumnHeader() {
  return (
    <View className="flex-row items-center gap-2 border-b border-hairline bg-surface px-3 py-2">
      <View className="w-[14px]" />
      <Eyebrow className="flex-1">Item</Eyebrow>
      <Text
        variant="eyebrow"
        tone="mid"
        className="w-[52px] text-right uppercase"
        maxFontSizeMultiplier={1.3}
      >
        Qty
      </Text>
      <Text
        variant="eyebrow"
        tone="mid"
        className="w-[56px] text-right uppercase"
        maxFontSizeMultiplier={1.3}
      >
        Expires
      </Text>
      <Text
        variant="eyebrow"
        tone="mid"
        className="w-[52px] text-right uppercase"
        maxFontSizeMultiplier={1.3}
      >
        Last £
      </Text>
      <View className="w-[16px]" />
    </View>
  );
}

function SectionBar({ title, first }: { readonly title: string; readonly first: boolean }) {
  return (
    <View
      className={`border-b border-hairline bg-surface-mute px-3 py-[10px] ${
        first ? '' : 'border-t'
      }`}
    >
      <Eyebrow>{title}</Eyebrow>
    </View>
  );
}

function PantrySkeleton() {
  return (
    <Card testID="pantry-skeleton">
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          className={`flex-row items-center gap-3 px-3 py-3 ${
            index === 3 ? '' : 'border-b border-hairline'
          }`}
        >
          <View className="h-2 w-2 rounded-pill bg-surface-mute" />
          <View className="flex-1 gap-[6px]">
            <View className="h-3 w-1/2 rounded-1 bg-surface-mute" />
            <View className="h-2 w-1/4 rounded-1 bg-paper-deep" />
          </View>
          <View className="h-3 w-10 rounded-1 bg-surface-mute" />
        </View>
      ))}
    </Card>
  );
}

function EmptyPantry({ onAdd }: { readonly onAdd: () => void }) {
  return (
    <View className="items-center px-4 py-16">
      <View className="mb-6 h-16 w-16 items-center justify-center rounded-pill bg-terracotta-bg">
        <Icon icon={Archive} accessibilityLabel="" size={28} color={TERRACOTTA} />
      </View>
      <Text variant="display-lg" className="text-center">
        Let&apos;s stock the pantry.
      </Text>
      <Text variant="body" tone="mid" className="mt-2 text-center">
        Add what&apos;s on your shelves to track freshness and value.
      </Text>
      <View className="mt-8 w-full">
        <Button label="Add by hand" kind="accent" size="lg" icon={Plus} full onPress={onAdd} />
      </View>
    </View>
  );
}

function noop(): void {}
