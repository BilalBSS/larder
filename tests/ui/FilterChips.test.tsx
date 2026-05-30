import { fireEvent, render, screen } from '@testing-library/react-native';

import { FilterChips } from '@/components/pantry/FilterChips';
import type { PantrySection } from '@domain/entities/group-pantry';
import type { PantryItem } from '@domain/entities/pantry-item';

const stub = {} as PantryItem;

function section(key: PantrySection['key'], title: string, count: number): PantrySection {
  return { key, title, items: Array.from({ length: count }, () => stub) };
}

const sections: PantrySection[] = [section('urgent', 'Use first', 2), section('fresh', 'Fresh', 1)];

describe('FilterChips', () => {
  it('renders an All chip plus a chip per section with counts', () => {
    render(<FilterChips value="all" onChange={jest.fn()} sections={sections} />);
    expect(screen.getByLabelText('All, 3 items')).toBeOnTheScreen();
    expect(screen.getByLabelText('Use first, 2 items')).toBeOnTheScreen();
    expect(screen.getByLabelText('Fresh, 1 items')).toBeOnTheScreen();
  });

  it('marks the active chip as selected', () => {
    render(<FilterChips value="urgent" onChange={jest.fn()} sections={sections} />);
    expect(screen.getByLabelText('Use first, 2 items').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByLabelText('All, 3 items').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('selects a section on press', () => {
    const onChange = jest.fn();
    render(<FilterChips value="all" onChange={onChange} sections={sections} />);
    fireEvent.press(screen.getByLabelText('Fresh, 1 items'));
    expect(onChange).toHaveBeenCalledWith('fresh');
  });
});
