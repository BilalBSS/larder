import { fireEvent, render, screen } from '@testing-library/react-native';

import { GlanceBar } from '@/components/pantry/GlanceBar';

describe('GlanceBar', () => {
  it('shows the at-risk value and the use-first count', () => {
    render(<GlanceBar atRisk={12.5} atRiskCount={4} useFirst={3} onUseFirst={jest.fn()} />);
    expect(screen.getByText('At risk')).toBeOnTheScreen();
    expect(screen.getByText('Use first')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('.50')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('items')).toBeOnTheScreen();
  });

  it('falls back to a count when items are at risk without costs', () => {
    render(<GlanceBar atRisk={0} atRiskCount={3} useFirst={2} onUseFirst={jest.fn()} />);
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.queryByText('.00')).toBeNull();
  });

  it('shows a quiet zero when nothing is at risk', () => {
    render(<GlanceBar atRisk={0} atRiskCount={0} useFirst={2} onUseFirst={jest.fn()} />);
    expect(screen.getByText('At risk')).toBeOnTheScreen();
    expect(screen.getByText('.00')).toBeOnTheScreen();
  });

  it('filters to use-first on press', () => {
    const onUseFirst = jest.fn();
    render(<GlanceBar atRisk={0} atRiskCount={0} useFirst={1} onUseFirst={onUseFirst} />);
    fireEvent.press(screen.getByLabelText('Use first, 1 item'));
    expect(onUseFirst).toHaveBeenCalled();
  });
});
