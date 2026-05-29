// / five-tab kit layout
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import {
  Archive,
  CookingPot,
  ShoppingCart,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import { TabBar, type TabBarItem } from '@ui/TabBar';

// / route to tab
const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Pantry', icon: Archive },
  shopping: { label: 'Shopping', icon: ShoppingCart },
  cook: { label: 'Cook', icon: CookingPot },
  spending: { label: 'Spending', icon: Wallet },
  you: { label: 'You', icon: User },
};

function KitTabBar({ state, navigation }: BottomTabBarProps) {
  const items: TabBarItem[] = state.routes.flatMap((route) => {
    const tab = TABS[route.name];
    return tab === undefined ? [] : [{ id: route.name, label: tab.label, icon: tab.icon }];
  });

  const activeId = state.routes[state.index]?.name ?? '';

  const onSelect = (id: string): void => {
    const target = state.routes.find((route) => route.name === id);
    if (target === undefined) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: target.key,
      canPreventDefault: true,
    });
    if (id !== activeId && !event.defaultPrevented) {
      navigation.navigate(target.name);
    }
  };

  return <TabBar items={items} activeId={activeId} onSelect={onSelect} />;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <KitTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shopping" />
      <Tabs.Screen name="cook" />
      <Tabs.Screen name="spending" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
