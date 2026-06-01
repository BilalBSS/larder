import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AddItemScreen from '@/app/add-item';
import { PantryCapError } from '@domain/use-cases/pantry';
import { pantryService } from '@domain/use-cases/pantry/service';
import { ENTITLEMENTS } from '@foundation/billing/entitlements';
import { useEntitlements, useUser } from '@foundation/context';

jest.mock('@domain/use-cases/pantry/service', () => ({
  pantryService: { add: jest.fn(), lookup: jest.fn() },
}));
jest.mock('@foundation/context', () => ({ useUser: jest.fn(), useEntitlements: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const mockAdd = pantryService.add as jest.Mock;
const mockLookup = pantryService.lookup as jest.Mock;
const mockUseUser = useUser as jest.Mock;
const mockUseEntitlements = useEntitlements as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
  mockUseEntitlements.mockReturnValue(ENTITLEMENTS.free);
  mockLookup.mockResolvedValue(null);
  mockAdd.mockResolvedValue(undefined);
});

function fillRequired(): void {
  fireEvent.changeText(screen.getByLabelText('Item name'), 'Bananas');
  fireEvent.changeText(screen.getByLabelText('Quantity'), '6');
  fireEvent.changeText(screen.getByLabelText('Unit'), 'count');
}

function submitState(): { disabled?: boolean } {
  return screen.getByRole('button', { name: 'Add to pantry' }).props.accessibilityState ?? {};
}

describe('AddItemScreen', () => {
  it('disables submit until required fields are valid', () => {
    render(<AddItemScreen />);
    expect(submitState()).toMatchObject({ disabled: true });
    fillRequired();
    expect(submitState()).toMatchObject({ disabled: false });
  });

  it('keeps submit disabled for a negative quantity', () => {
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByLabelText('Item name'), 'Bananas');
    fireEvent.changeText(screen.getByLabelText('Unit'), 'count');
    fireEvent.changeText(screen.getByLabelText('Quantity'), '-1');
    expect(submitState()).toMatchObject({ disabled: true });
  });

  it('autofills category and expiry from a canonical match', async () => {
    mockLookup.mockResolvedValue({
      canonicalName: 'bananas',
      category: 'produce',
      defaultExpirationDays: 7,
    });
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByLabelText('Item name'), 'banana');
    fireEvent(screen.getByLabelText('Item name'), 'blur');
    await waitFor(() => expect(screen.getByLabelText('Category').props.value).toBe('produce'));
    expect(screen.getByLabelText('Expires in days').props.value).toBe('7');
  });

  it('falls back to other for an unknown item', async () => {
    mockLookup.mockResolvedValue(null);
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByLabelText('Item name'), 'zzz');
    fireEvent(screen.getByLabelText('Item name'), 'blur');
    await waitFor(() => expect(screen.getByLabelText('Category').props.value).toBe('other'));
  });

  it('adds the item then dismisses', async () => {
    render(<AddItemScreen />);
    fillRequired();
    fireEvent.press(screen.getByRole('button', { name: 'Add to pantry' }));
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
    expect(mockAdd.mock.calls[0][0]).toMatchObject({
      householdId: 'h-1',
      userId: 'u-1',
      displayName: 'Bananas',
      quantity: 6,
      unit: 'count',
      category: 'other',
    });
  });

  it('forwards the autofilled expiry and purchase time to add', async () => {
    mockLookup.mockResolvedValue({
      canonicalName: 'bananas',
      category: 'produce',
      defaultExpirationDays: 7,
    });
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByLabelText('Item name'), 'banana');
    fireEvent(screen.getByLabelText('Item name'), 'blur');
    await waitFor(() => expect(screen.getByLabelText('Expires in days').props.value).toBe('7'));
    fireEvent.changeText(screen.getByLabelText('Quantity'), '6');
    fireEvent.changeText(screen.getByLabelText('Unit'), 'count');
    fireEvent.press(screen.getByRole('button', { name: 'Add to pantry' }));
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
    const input = mockAdd.mock.calls[0][0];
    expect(input.estimatedExpirationDays).toBe(7);
    expect(typeof input.lastPurchasedAt).toBe('string');
    expect(input.category).toBe('produce');
  });

  it('submits once despite a double press', async () => {
    render(<AddItemScreen />);
    fillRequired();
    const button = screen.getByRole('button', { name: 'Add to pantry' });
    fireEvent.press(button);
    fireEvent.press(button);
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
  });

  it('shows the honest limit state on a cap error', async () => {
    mockAdd.mockRejectedValue(new PantryCapError());
    render(<AddItemScreen />);
    fillRequired();
    fireEvent.press(screen.getByRole('button', { name: 'Add to pantry' }));
    await waitFor(() =>
      expect(screen.getByText(/reached the free limit of 50 items/)).toBeOnTheScreen(),
    );
  });
});
