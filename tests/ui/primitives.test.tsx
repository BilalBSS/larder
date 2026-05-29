import { fireEvent, render, screen } from '@testing-library/react-native';
import { Plus, Share2 } from 'lucide-react-native';

import { Avatar } from '@ui/Avatar';
import { deriveAvatarColor } from '@ui/avatar-color';
import { Button } from '@ui/Button';
import { Checkbox } from '@ui/Checkbox';
import { IconButton } from '@ui/IconButton';
import { QuickAdd } from '@ui/QuickAdd';
import { TopBar } from '@ui/TopBar';
import { UrgencyTag } from '@ui/UrgencyTag';

describe('Button', () => {
  it('renders the label and fires onPress', () => {
    const onPress = jest.fn();
    render(<Button label="Add all" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Add all' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not fire when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Add all" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Add all' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each(['primary', 'secondary', 'accent', 'ghost', 'danger'] as const)(
    'renders the %s kind',
    (kind) => {
      render(<Button label="Save" kind={kind} onPress={jest.fn()} />);
      expect(screen.getByText('Save')).toBeOnTheScreen();
    },
  );

  it('renders a leading icon', () => {
    render(<Button label="Add" icon={Plus} onPress={jest.fn()} />);
    expect(screen.getByText('Add')).toBeOnTheScreen();
  });
});

describe('IconButton', () => {
  it('uses its accessibility label and fires onPress', () => {
    const onPress = jest.fn();
    render(<IconButton icon={Share2} onPress={onPress} accessibilityLabel="Share list" />);
    fireEvent.press(screen.getByLabelText('Share list'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('toggles via onPress', () => {
    const onPress = jest.fn();
    render(<Checkbox checked={false} onPress={onPress} accessibilityLabel="toggle milk" />);
    fireEvent.press(screen.getByLabelText('toggle milk'));
    expect(onPress).toHaveBeenCalled();
  });

  it('reflects the checked state', () => {
    render(<Checkbox checked onPress={jest.fn()} accessibilityLabel="toggle milk" />);
    expect(screen.getByLabelText('toggle milk').props.accessibilityState.checked).toBe(true);
  });
});

describe('UrgencyTag', () => {
  it.each(['urgent', 'soon', 'fresh', 'frozen', 'gone'] as const)('renders the %s tone', (tone) => {
    render(<UrgencyTag tone={tone}>Use first</UrgencyTag>);
    expect(screen.getByText('Use first')).toBeOnTheScreen();
  });
});

describe('Avatar', () => {
  it('shows the initial from the label', () => {
    render(<Avatar userId="u-1" label="Lina" />);
    expect(screen.getByText('L')).toBeOnTheScreen();
  });

  it('falls back to the user id initial', () => {
    render(<Avatar userId="eli-1" />);
    expect(screen.getByText('E')).toBeOnTheScreen();
  });

  it('colors the circle from the user id', () => {
    render(<Avatar userId="u-1" label="Lina" />);
    const node = screen.getByLabelText('Lina');
    const flattened = ([] as unknown[]).concat(node.props.style as unknown);
    const match = flattened.some(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        (entry as { backgroundColor?: string }).backgroundColor === deriveAvatarColor('u-1'),
    );
    expect(match).toBe(true);
  });
});

describe('TopBar', () => {
  it('renders the title, eyebrow, sub and trailing controls', () => {
    render(
      <TopBar
        title="Shopping"
        eyebrow="Live · 2 on this list"
        sub="3 of 8 to grab"
        trailing={<IconButton icon={Share2} onPress={jest.fn()} accessibilityLabel="Share list" />}
      />,
    );
    expect(screen.getByText('Shopping')).toBeOnTheScreen();
    expect(screen.getByText('Live · 2 on this list')).toBeOnTheScreen();
    expect(screen.getByText('3 of 8 to grab')).toBeOnTheScreen();
    expect(screen.getByLabelText('Share list')).toBeOnTheScreen();
  });
});

describe('QuickAdd', () => {
  it('submits typed text and exposes the scan control', () => {
    const onSubmit = jest.fn();
    const onScan = jest.fn();
    render(
      <QuickAdd
        value="eggs"
        onChangeText={jest.fn()}
        onSubmit={onSubmit}
        onScan={onScan}
        inputAccessibilityLabel="new item name"
      />,
    );
    fireEvent(screen.getByLabelText('new item name'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Scan barcode'));
    expect(onScan).toHaveBeenCalled();
  });
});
