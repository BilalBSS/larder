import { fireEvent, render, screen } from '@testing-library/react-native';

import { GlanceBar } from '@/components/pantry/GlanceBar';

describe('GlanceBar', () => {
  it('shows total value and the use-first count', () => {
    render(<GlanceBar value={12.5} useFirst={3} onUseFirst={jest.fn()} />);
    expect(screen.getByText('Total value')).toBeOnTheScreen();
    expect(screen.getByText('Use first')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('.50')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('items')).toBeOnTheScreen();
  });

  it('filters to use-first on press', () => {
    const onUseFirst = jest.fn();
    render(<GlanceBar value={0} useFirst={1} onUseFirst={onUseFirst} />);
    fireEvent.press(screen.getByLabelText('Use first, 1 item'));
    expect(onUseFirst).toHaveBeenCalled();
  });
});
