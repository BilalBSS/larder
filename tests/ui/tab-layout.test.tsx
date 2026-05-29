import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import TabLayout from '@/app/(tabs)/_layout';

let capturedTabBar: ((props: BottomTabBarProps) => ReactElement) | null = null;

jest.mock('expo-router', () => ({
  Tabs: Object.assign(
    (props: { tabBar: (p: BottomTabBarProps) => ReactElement }) => {
      capturedTabBar = props.tabBar;
      return null;
    },
    { Screen: () => null },
  ),
}));

const ROUTES = ['index', 'shopping', 'cook', 'spending', 'you'];

function barProps(
  activeIndex: number,
  navigate = jest.fn(),
  emit = jest.fn(() => ({ defaultPrevented: false })),
): BottomTabBarProps {
  return {
    state: {
      index: activeIndex,
      routes: ROUTES.map((name) => ({ key: `${name}-key`, name })),
    },
    navigation: { navigate, emit },
    descriptors: {},
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
}

beforeEach(() => {
  capturedTabBar = null;
  render(<TabLayout />);
});

describe('TabLayout', () => {
  it('renders all five kit tabs', () => {
    if (capturedTabBar === null) throw new Error('tabBar not captured');
    render(capturedTabBar(barProps(0)));
    for (const label of ['Pantry', 'Shopping', 'Cook', 'Spending', 'You']) {
      expect(screen.getByLabelText(label)).toBeOnTheScreen();
    }
  });

  it('defaults to Pantry as the active tab', () => {
    if (capturedTabBar === null) throw new Error('tabBar not captured');
    render(capturedTabBar(barProps(0)));
    expect(screen.getByLabelText('Pantry').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Shopping').props.accessibilityState.selected).toBe(false);
  });

  it('navigates to the pressed tab', () => {
    if (capturedTabBar === null) throw new Error('tabBar not captured');
    const navigate = jest.fn();
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    render(capturedTabBar(barProps(0, navigate, emit)));
    fireEvent.press(screen.getByLabelText('Cook'));
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'cook-key' }),
    );
    expect(navigate).toHaveBeenCalledWith('cook');
  });

  it('does not navigate when the active tab is pressed', () => {
    if (capturedTabBar === null) throw new Error('tabBar not captured');
    const navigate = jest.fn();
    render(capturedTabBar(barProps(0, navigate)));
    fireEvent.press(screen.getByLabelText('Pantry'));
    expect(navigate).not.toHaveBeenCalled();
  });
});
