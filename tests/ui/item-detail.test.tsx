import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import ItemDetailScreen from '@/app/item/[id]';
import type { PantryItem } from '@domain/entities/pantry-item';
import { pantryService } from '@domain/use-cases/pantry/service';
import { useUser } from '@foundation/context';

jest.mock('@domain/use-cases/pantry/service', () => ({
  pantryService: { get: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));
jest.mock('@foundation/context', () => ({ useUser: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const mockGet = pantryService.get as jest.Mock;
const mockUpdate = pantryService.update as jest.Mock;
const mockRemove = pantryService.remove as jest.Mock;
const mockUseUser = useUser as jest.Mock;
const mockParams = useLocalSearchParams as jest.Mock;
const mockBack = router.back as jest.Mock;

const base: PantryItem = {
  id: 'i-1',
  householdId: 'h-1',
  canonicalName: 'bananas',
  displayName: 'Bananas',
  category: 'produce',
  quantity: 6,
  unit: 'count',
  expirationDate: null,
  estimatedExpirationDays: null,
  lastPurchasedAt: null,
  lastUnitCost: null,
  notes: null,
  isFrozen: false,
  createdByUserId: 'u-1',
  updatedByUserId: 'u-1',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

function item(overrides: Partial<PantryItem> = {}): PantryItem {
  return { ...base, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
  mockParams.mockReturnValue({ id: 'i-1' });
  mockGet.mockResolvedValue(item());
  mockUpdate.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
});

describe('ItemDetailScreen', () => {
  it('loads and shows the item', async () => {
    render(<ItemDetailScreen />);
    expect(await screen.findByText('Bananas')).toBeOnTheScreen();
    expect(mockGet).toHaveBeenCalledWith('i-1', 'h-1');
  });

  it('saves an edited quantity then dismisses', async () => {
    render(<ItemDetailScreen />);
    await screen.findByText('Bananas');
    fireEvent.press(screen.getByLabelText('Increase quantity'));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      id: 'i-1',
      householdId: 'h-1',
      userId: 'u-1',
      quantity: 7,
      isFrozen: false,
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('toggles frozen and saves it', async () => {
    render(<ItemDetailScreen />);
    await screen.findByText('Bananas');
    fireEvent.press(screen.getByLabelText('Frozen'));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({ isFrozen: true });
  });

  it('keeps edits and shows an inline error when save fails', async () => {
    mockUpdate.mockRejectedValue(new Error('nope'));
    render(<ItemDetailScreen />);
    await screen.findByText('Bananas');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText(/Couldn't save/)).toBeOnTheScreen());
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('confirms then removes the item', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<ItemDetailScreen />);
    await screen.findByText('Bananas');
    fireEvent.press(screen.getByRole('button', { name: 'Remove from pantry' }));
    expect(spy).toHaveBeenCalled();
    const buttons = spy.mock.calls[0]?.[2];
    buttons?.[1]?.onPress?.();
    await waitFor(() =>
      expect(mockRemove).toHaveBeenCalledWith({ id: 'i-1', householdId: 'h-1', userId: 'u-1' }),
    );
    spy.mockRestore();
  });

  it('shows a gone message when the item is missing', async () => {
    mockGet.mockResolvedValue(null);
    render(<ItemDetailScreen />);
    expect(await screen.findByText(/no longer in your pantry/)).toBeOnTheScreen();
  });
});
