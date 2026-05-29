import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickAddBar } from '@/components/shopping/QuickAddBar';

describe('QuickAddBar', () => {
  it('adds a trimmed item and clears the field', () => {
    const onAdd = jest.fn();
    render(<QuickAddBar onAdd={onAdd} />);
    const input = screen.getByLabelText('new item name');
    fireEvent.changeText(input, '  eggs  ');
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith('eggs');
    expect(input.props.value).toBe('');
  });

  it('ignores an empty submission', () => {
    const onAdd = jest.fn();
    render(<QuickAddBar onAdd={onAdd} />);
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('adds on submit editing', () => {
    const onAdd = jest.fn();
    render(<QuickAddBar onAdd={onAdd} />);
    const input = screen.getByLabelText('new item name');
    fireEvent.changeText(input, 'bread');
    fireEvent(input, 'submitEditing');
    expect(onAdd).toHaveBeenCalledWith('bread');
  });
});
