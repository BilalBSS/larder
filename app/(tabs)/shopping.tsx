// / shopping list screen
import { MoreHorizontal, Share2 } from 'lucide-react-native';
import { Fragment } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { QuickAddBar } from '@/components/shopping/QuickAddBar';
import { ShopRow } from '@/components/shopping/ShopRow';
import { SmartReorderBanner } from '@/components/shopping/SmartReorderBanner';
import { useShoppingList } from '@/components/shopping/useShoppingList';
import { groupByCategory } from '@domain/entities/group-by-category';
import { useUser } from '@foundation/context';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { IconButton } from '@ui/IconButton';
import { Pill } from '@ui/Pill';
import { Screen } from '@ui/Screen';
import { SectionHead } from '@ui/SectionHead';
import { Text } from '@ui/Text';
import { TopBar } from '@ui/TopBar';

// / fresh dot token
const FRESH = '#4F7C45';

export default function ShoppingScreen() {
  const user = useUser();
  const householdId = user?.household_id ?? null;
  const currentUserId = user?.id ?? '';
  const { items, loading, error, add, toggle, remove, reload } = useShoppingList({
    householdId,
    userId: currentUserId,
  });

  if (householdId === null) {
    return (
      <Screen className="items-center justify-center px-8">
        <Text variant="title" className="text-center">
          No household yet.
        </Text>
        <Text variant="body" tone="mid" className="mt-2 text-center">
          Create or join a household to start a shared list.
        </Text>
      </Screen>
    );
  }

  const sections = groupByCategory(items);
  const isEmpty = items.length === 0;
  const remaining = items.filter((item) => !item.isCheckedOff).length;
  const contributors = new Set(items.map((item) => item.ownerUserId ?? item.addedByUserId)).size;
  const peopleLabel = contributors === 1 ? '1 person' : `${contributors} people`;

  return (
    <Screen>
      <TopBar
        title="Shopping"
        eyebrow={isEmpty ? 'Live' : `Live · ${peopleLabel}`}
        {...(isEmpty ? {} : { sub: `${remaining} of ${items.length} to grab` })}
        trailing={
          <>
            <Pill>
              <View className="h-[7px] w-[7px] rounded-pill" style={{ backgroundColor: FRESH }} />
              <Text variant="meta" tone="mid">
                Live
              </Text>
            </Pill>
            <IconButton icon={Share2} onPress={noop} accessibilityLabel="Share list" tone="ghost" />
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
      <ScrollView contentContainerClassName="gap-3 px-4 pb-10">
        <QuickAddBar onAdd={add} />
        {!isEmpty ? <SmartReorderBanner /> : null}
        {error !== null ? (
          <View className="flex-row items-center justify-between">
            <Text variant="meta" tone="urgent">
              Could not load your list. Check your connection.
            </Text>
            <Button label="Retry" kind="ghost" size="sm" onPress={reload} />
          </View>
        ) : null}
        {loading && items.length === 0 ? (
          <View className="items-center py-16">
            <ActivityIndicator testID="shopping-loading" color={FRESH} />
          </View>
        ) : sections.length === 0 ? (
          <View className="items-center px-4 py-16">
            <Text variant="title" className="text-center">
              Your list is empty.
            </Text>
            <Text variant="body" tone="mid" className="mt-2 text-center">
              Add something above to get started.
            </Text>
          </View>
        ) : (
          <Card>
            {sections.map((section, sectionIndex) => (
              <Fragment key={section.key}>
                <SectionHead
                  title={section.title}
                  remaining={section.remaining}
                  total={section.items.length}
                  first={sectionIndex === 0}
                />
                {section.items.map((item, itemIndex) => (
                  <ShopRow
                    key={item.id}
                    item={item}
                    currentUserId={currentUserId}
                    onToggle={toggle}
                    onRemove={remove}
                    last={itemIndex === section.items.length - 1}
                  />
                ))}
              </Fragment>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function noop(): void {}
