import { fireEvent, render, screen } from '@testing-library/react-native';
import { Camera, ShoppingCart, User } from 'lucide-react-native';

import { AvatarStack } from '@ui/AvatarStack';
import { Card } from '@ui/Card';
import { FAB } from '@ui/FAB';
import { Pill } from '@ui/Pill';
import { SectionHead } from '@ui/SectionHead';
import { TabBar, type TabBarItem } from '@ui/TabBar';
import { Text } from '@ui/Text';

const tabs: TabBarItem[] = [
  { id: 'shop', label: 'Shopping', icon: ShoppingCart },
  { id: 'you', label: 'You', icon: User },
];

describe('TabBar', () => {
  it('marks the active tab and reports selection', () => {
    const onSelect = jest.fn();
    render(<TabBar items={tabs} activeId="shop" onSelect={onSelect} />);
    expect(screen.getByLabelText('Shopping').props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByLabelText('You'));
    expect(onSelect).toHaveBeenCalledWith('you');
  });
});

describe('FAB', () => {
  it('fires onPress and exposes its label', () => {
    const onPress = jest.fn();
    render(<FAB icon={Camera} onPress={onPress} accessibilityLabel="Scan a receipt" />);
    fireEvent.press(screen.getByLabelText('Scan a receipt'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('AvatarStack', () => {
  it('shows an overflow count beyond the cap', () => {
    render(
      <AvatarStack
        members={[{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }, { userId: 'd' }]}
        max={2}
      />,
    );
    expect(screen.getByText('+2')).toBeOnTheScreen();
  });
});

describe('SectionHead', () => {
  it('renders the title and remaining count', () => {
    render(<SectionHead title="Produce" remaining={2} total={3} first />);
    expect(screen.getByText('Produce')).toBeOnTheScreen();
    expect(screen.getByText('2 of 3')).toBeOnTheScreen();
  });
});

describe('Card and Pill', () => {
  it('render their children', () => {
    render(
      <Card padding="md">
        <Pill tone="accent">
          <Text variant="meta">Live</Text>
        </Pill>
      </Card>,
    );
    expect(screen.getByText('Live')).toBeOnTheScreen();
  });
});
