import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Bar } from '@ui/Bar';
import { Donut } from '@ui/Donut';

describe('Bar', () => {
  it('fills proportionally to value', () => {
    render(<Bar value={25} max={100} color="#B5532D" />);
    expect(screen.getByTestId('bar-fill')).toHaveStyle({ width: '25%' });
  });

  it('clamps overflow to full width', () => {
    render(<Bar value={250} max={100} color="#B5532D" />);
    expect(screen.getByTestId('bar-fill')).toHaveStyle({ width: '100%' });
  });

  it('clamps negatives and zero max to empty', () => {
    render(<Bar value={-5} max={100} color="#B5532D" />);
    expect(screen.getByTestId('bar-fill')).toHaveStyle({ width: '0%' });
    screen.unmount();
    render(<Bar value={10} max={0} color="#B5532D" />);
    expect(screen.getByTestId('bar-fill')).toHaveStyle({ width: '0%' });
  });
});

describe('Donut', () => {
  it('exposes the summary label and center content', () => {
    render(
      <Donut
        slices={[
          { value: 60, color: '#4F7C45' },
          { value: 40, color: '#B5532D' },
        ]}
        accessibilityLabel="Spending by category: Produce £60, Meat £40."
      >
        <Text>£100</Text>
      </Donut>,
    );
    expect(screen.getByLabelText('Spending by category: Produce £60, Meat £40.')).toBeOnTheScreen();
    expect(screen.getByText('£100')).toBeOnTheScreen();
  });

  it('renders the empty track without slices', () => {
    render(<Donut slices={[]} accessibilityLabel="No itemized spending." />);
    expect(screen.getByLabelText('No itemized spending.')).toBeOnTheScreen();
  });
});
