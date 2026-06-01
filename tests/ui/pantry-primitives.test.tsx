import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CurrencyProvider } from '@foundation/currency';
import { Chip } from '@ui/Chip';
import { Money } from '@ui/Money';
import { UrgencyDot } from '@ui/UrgencyDot';

describe('Money', () => {
  it('splits pounds and pence', () => {
    render(<Money value={12.5} />);
    expect(screen.getByText('£')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('.50')).toBeOnTheScreen();
  });

  it('pads single-digit pence', () => {
    render(<Money value={12.05} />);
    expect(screen.getByText('.05')).toBeOnTheScreen();
  });

  it('renders the household currency glyph', () => {
    render(
      <CurrencyProvider value="USD">
        <Money value={3.25} />
      </CurrencyProvider>,
    );
    expect(screen.getByText('$')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('.25')).toBeOnTheScreen();
  });

  it('applies the urgent tone to the amount', () => {
    render(<Money value={4.5} tone="urgent" />);
    expect(screen.getByText('4').props.className).toContain('text-urgency-urgent-deep');
  });
});

describe('UrgencyDot', () => {
  it('colors the dot by tone', () => {
    const tree = render(<UrgencyDot tone="urgent" />).toJSON();
    const className = (tree as { props: { className?: string } } | null)?.props.className ?? '';
    expect(className).toContain('bg-urgency-urgent');
  });
});

describe('Chip', () => {
  it('renders label and count with a 44px touch target', () => {
    render(<Chip label="Use first" count={2} active={false} onPress={jest.fn()} />);
    const chip = screen.getByLabelText('Use first');
    expect(screen.getByText('Use first')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    const flat = StyleSheet.flatten(chip.props.style);
    expect(flat.minHeight).toBe(44);
  });

  it('reflects the active state', () => {
    render(<Chip label="All" active onPress={jest.fn()} />);
    expect(screen.getByLabelText('All').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('fires onPress', () => {
    const onPress = jest.fn();
    render(<Chip label="All" active={false} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('All'));
    expect(onPress).toHaveBeenCalled();
  });
});
