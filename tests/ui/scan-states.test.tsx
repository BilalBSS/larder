import { fireEvent, render, screen } from '@testing-library/react-native';

import { ScanDone } from '@/components/scan/ScanDone';
import { ScanProcessing } from '@/components/scan/ScanProcessing';
import { ScanReconcile, type ScanReconcileLine } from '@/components/scan/ScanReconcile';

describe('ScanProcessing', () => {
  it('shows the reading state', () => {
    render(<ScanProcessing state="working" onRetry={jest.fn()} onAddByHand={jest.fn()} />);
    expect(screen.getByText('Reading your receipt…')).toBeOnTheScreen();
  });

  it('shows the slow hint', () => {
    render(<ScanProcessing state="slow" onRetry={jest.fn()} onAddByHand={jest.fn()} />);
    expect(screen.getByText(/Still reading/)).toBeOnTheScreen();
  });

  it('offers retry and add-by-hand on failure', () => {
    const onRetry = jest.fn();
    const onAddByHand = jest.fn();
    render(<ScanProcessing state="failed" onRetry={onRetry} onAddByHand={onAddByHand} />);
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Add by hand' }));
    expect(onAddByHand).toHaveBeenCalled();
  });
});

describe('ScanDone', () => {
  it('shows the added count and total', () => {
    render(
      <ScanDone added={3} skipped={0} total={12.5} attribution="you" onSeePantry={jest.fn()} />,
    );
    expect(screen.getByText('3 items added to pantry.')).toBeOnTheScreen();
    expect(screen.getByText(/logged to you/)).toBeOnTheScreen();
  });

  it('shows the skipped count when capped', () => {
    render(<ScanDone added={2} skipped={1} total={5} attribution="you" onSeePantry={jest.fn()} />);
    expect(screen.getByText(/1 not added/)).toBeOnTheScreen();
  });

  it('navigates to the pantry', () => {
    const onSeePantry = jest.fn();
    render(
      <ScanDone added={1} skipped={0} total={1} attribution="you" onSeePantry={onSeePantry} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'See pantry' }));
    expect(onSeePantry).toHaveBeenCalled();
  });
});

function line(overrides: Partial<ScanReconcileLine> = {}): ScanReconcileLine {
  return {
    key: 'l1',
    displayName: 'Milk',
    category: 'dairy',
    quantity: 1,
    unit: 'each',
    lastUnitCost: 1.5,
    recognised: true,
    ...overrides,
  };
}

const handlers = {
  onChangeName: jest.fn(),
  onSettleName: jest.fn(),
  onDelete: jest.fn(),
  onConfirm: jest.fn(),
};

describe('ScanReconcile', () => {
  it('shows the all-recognised banner', () => {
    render(
      <ScanReconcile
        storeName="Tesco"
        lines={[line()]}
        total={1.5}
        attributionUserId="u1"
        overCapAddCount={null}
        submitting={false}
        error={null}
        {...handlers}
      />,
    );
    expect(screen.getByText('All 1 item recognised at Tesco.')).toBeOnTheScreen();
  });

  it('flags an unclear line and supports fixing', () => {
    const onChangeName = jest.fn();
    render(
      <ScanReconcile
        storeName={null}
        lines={[line({ recognised: false, displayName: '' })]}
        total={0}
        attributionUserId="u1"
        overCapAddCount={null}
        submitting={false}
        error={null}
        {...handlers}
        onChangeName={onChangeName}
      />,
    );
    expect(screen.getByText(/needs fixing/)).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Fix item name'), 'Apples');
    expect(onChangeName).toHaveBeenCalledWith('l1', 'Apples');
  });

  it('disables confirm when a line has no name', () => {
    render(
      <ScanReconcile
        storeName={null}
        lines={[line({ recognised: false, displayName: '' })]}
        total={0}
        attributionUserId="u1"
        overCapAddCount={null}
        submitting={false}
        error={null}
        {...handlers}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Add 1 item to pantry/ }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('confirms when every line is named', () => {
    const onConfirm = jest.fn();
    render(
      <ScanReconcile
        storeName={null}
        lines={[line()]}
        total={1.5}
        attributionUserId="u1"
        overCapAddCount={null}
        submitting={false}
        error={null}
        {...handlers}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: /Add 1 item to pantry/ }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('deletes a line', () => {
    const onDelete = jest.fn();
    render(
      <ScanReconcile
        storeName={null}
        lines={[line()]}
        total={1.5}
        attributionUserId="u1"
        overCapAddCount={null}
        submitting={false}
        error={null}
        {...handlers}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(screen.getByLabelText('Remove Milk'));
    expect(onDelete).toHaveBeenCalledWith('l1');
  });

  it('shows the over-cap hint', () => {
    render(
      <ScanReconcile
        storeName={null}
        lines={[line()]}
        total={1.5}
        attributionUserId="u1"
        overCapAddCount={3}
        submitting={false}
        error={null}
        {...handlers}
      />,
    );
    expect(screen.getByText(/3 will be added/)).toBeOnTheScreen();
  });
});
