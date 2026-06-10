import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import CurrencyScreen from '@/app/currency';
import { householdService } from '@domain/use-cases/household/service';
import { useRefreshUser, useUser } from '@foundation/context';

jest.mock('@domain/use-cases/household/service', () => ({
  householdService: { setCurrency: jest.fn() },
}));
jest.mock('@foundation/context', () => ({ useUser: jest.fn(), useRefreshUser: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const mockSet = householdService.setCurrency as jest.Mock;
const mockUseUser = useUser as jest.Mock;
const mockUseRefresh = useRefreshUser as jest.Mock;
const mockBack = router.back as jest.Mock;
const refresh = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free', currency: 'GBP' });
  mockUseRefresh.mockReturnValue(refresh);
  mockSet.mockResolvedValue(undefined);
  refresh.mockResolvedValue(undefined);
});

describe('CurrencyScreen', () => {
  it('lists the supported currencies', () => {
    render(<CurrencyScreen />);
    expect(screen.getByText('British pound')).toBeOnTheScreen();
    expect(screen.getByText('US dollar')).toBeOnTheScreen();
    expect(screen.getByText('Euro')).toBeOnTheScreen();
  });

  it('sets a new currency then refreshes and dismisses', async () => {
    render(<CurrencyScreen />);
    fireEvent.press(screen.getByLabelText('US dollar'));
    await waitFor(() => expect(mockSet).toHaveBeenCalledWith('h-1', 'USD'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
  });

  it('dismisses without writing when the current currency is chosen', () => {
    render(<CurrencyScreen />);
    fireEvent.press(screen.getByLabelText('British pound'));
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows an error when the update fails', async () => {
    mockSet.mockRejectedValue(new Error('nope'));
    render(<CurrencyScreen />);
    fireEvent.press(screen.getByLabelText('Euro'));
    await waitFor(() => expect(screen.getByText(/Couldn't update currency/)).toBeOnTheScreen());
    expect(mockBack).not.toHaveBeenCalled();
  });
});
