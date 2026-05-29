import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickAddBar } from '@/components/shopping/QuickAddBar';

describe('QuickAddBar', () => {
  it('adds a trimmed item and clears the field', () => {
    const onAdd = jest.fn();
    render(<QuickAddBar onAdd={onAdd} />);
    const input = screen.getByLabelText('new item name');
    fireEvent.changeText(input, '  eggs  ');
    fireEvent(input, 'submitEditing');
    expect(onAdd).toHaveBeenCalledWith('eggs');
    expect(input.props.value).toBe('');
  });

  it('ignores an empty submission', () => {
    const onAdd = jest.fn();
    render(<QuickAddBar onAdd={onAdd} />);
    fireEvent(screen.getByLabelText('new item name'), 'submitEditing');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('exposes the scan control when a handler is given', () => {
    const onScan = jest.fn();
    render(<QuickAddBar onAdd={jest.fn()} onScan={onScan} />);
    fireEvent.press(screen.getByLabelText('Scan barcode'));
    expect(onScan).toHaveBeenCalled();
  });
});
