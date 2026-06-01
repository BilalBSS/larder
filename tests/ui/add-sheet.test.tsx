import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddScreen from '@/app/add';
import { ENTITLEMENTS } from '@foundation/billing/entitlements';
import { useEntitlements, useUser } from '@foundation/context';
import { receiptService } from '@domain/use-cases/receipt/service';

jest.mock('@domain/use-cases/receipt/service', () => ({
  receiptService: { countThisMonth: jest.fn() },
}));
jest.mock('@foundation/context', () => ({ useUser: jest.fn(), useEntitlements: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn() } }));

const mockCount = receiptService.countThisMonth as jest.Mock;
const mockUseUser = useUser as jest.Mock;
const mockUseEnt = useEntitlements as jest.Mock;
const mockReplace = router.replace as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ id: 'u1', household_id: 'h1', tier: 'free', currency: 'GBP' });
  mockUseEnt.mockReturnValue(ENTITLEMENTS.free);
  mockCount.mockResolvedValue(0);
});

describe('AddScreen', () => {
  it('routes to scan and add-by-hand', async () => {
    render(<AddScreen />);
    await waitFor(() => expect(mockCount).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText('Scan a receipt'));
    expect(mockReplace).toHaveBeenCalledWith('/scan');
    fireEvent.press(screen.getByLabelText('Add by hand'));
    expect(mockReplace).toHaveBeenCalledWith('/add-item');
  });

  it('shows the cap state when scans are used up', async () => {
    mockCount.mockResolvedValue(8);
    render(<AddScreen />);
    await waitFor(() => expect(screen.getByText(/used your 8 scans/)).toBeOnTheScreen());
    expect(screen.queryByLabelText('Scan a receipt')).toBeNull();
  });
});
