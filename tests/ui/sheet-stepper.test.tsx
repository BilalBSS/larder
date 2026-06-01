import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Sheet } from '@ui/Sheet';
import { Stepper } from '@ui/Stepper';

describe('Stepper', () => {
  it('increments and decrements by step', () => {
    const onChange = jest.fn();
    render(<Stepper value={3} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Increase quantity'));
    expect(onChange).toHaveBeenCalledWith(4);
    fireEvent.press(screen.getByLabelText('Decrease quantity'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables decrease at the minimum', () => {
    const onChange = jest.fn();
    render(<Stepper value={0} onChange={onChange} />);
    expect(screen.getByLabelText('Decrease quantity')).toBeDisabled();
  });

  it('announces the current value', () => {
    render(<Stepper value={2} onChange={jest.fn()} />);
    expect(screen.getByLabelText('quantity 2')).toBeOnTheScreen();
  });

  it('formats a fractional value', () => {
    render(<Stepper value={1.5} onChange={jest.fn()} />);
    expect(screen.getByText('1.5')).toBeOnTheScreen();
  });
});

describe('Sheet', () => {
  it('renders the title and children', () => {
    render(
      <Sheet title="Bananas" onClose={jest.fn()}>
        <Text>body content</Text>
      </Sheet>,
    );
    expect(screen.getByText('Bananas')).toBeOnTheScreen();
    expect(screen.getByText('body content')).toBeOnTheScreen();
  });

  it('closes on the close button', () => {
    const onClose = jest.fn();
    render(
      <Sheet title="Bananas" onClose={onClose}>
        <Text>body</Text>
      </Sheet>,
    );
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
