import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import BudgetScreen from '@/app/budget';
import { spendingService } from '@domain/use-cases/spending/service';
import { useUser } from '@foundation/context';

jest.mock('@foundation/context', () => ({ useUser: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('@domain/use-cases/spending/service', () => ({
  spendingService: {
    budgets: jest.fn(),
    setBudget: jest.fn(),
    clearBudget: jest.fn(),
  },
}));

const mockUseUser = useUser as jest.Mock;
const mockService = spendingService as jest.Mocked<typeof spendingService>;

function budget(scope: 'household' | 'personal', monthlyLimit: number) {
  return {
    id: `b-${scope}`,
    householdId: 'h-1',
    userId: scope === 'personal' ? 'u-1' : null,
    scope,
    category: null,
    monthlyLimit,
    alertThresholdPct: 80,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
  mockService.budgets.mockResolvedValue({ household: null, personal: null });
  mockService.setBudget.mockResolvedValue(undefined);
  mockService.clearBudget.mockResolvedValue(undefined);
});

describe('BudgetScreen', () => {
  it('prefills existing budgets', async () => {
    mockService.budgets.mockResolvedValue({
      household: budget('household', 640),
      personal: budget('personal', 400),
    });
    render(<BudgetScreen />);
    await waitFor(() =>
      expect(screen.getByLabelText('Household budget amount')).toHaveProp('value', '640'),
    );
    expect(screen.getByLabelText('Personal cap amount')).toHaveProp('value', '400');
  });

  it('saves changed budgets and closes', async () => {
    render(<BudgetScreen />);
    await waitFor(() => expect(mockService.budgets).toHaveBeenCalled());
    fireEvent.changeText(screen.getByLabelText('Household budget amount'), '640');
    fireEvent.press(screen.getByText('Save'));
    await waitFor(() =>
      expect(mockService.setBudget).toHaveBeenCalledWith(
        { householdId: 'h-1', userId: 'u-1', target: 'household' },
        640,
      ),
    );
    expect(mockService.clearBudget).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });

  it('writes only the changed field and leaves the other untouched', async () => {
    mockService.budgets.mockResolvedValue({
      household: budget('household', 640),
      personal: budget('personal', 400),
    });
    render(<BudgetScreen />);
    await waitFor(() =>
      expect(screen.getByLabelText('Personal cap amount')).toHaveProp('value', '400'),
    );
    fireEvent.changeText(screen.getByLabelText('Personal cap amount'), '450');
    fireEvent.press(screen.getByText('Save'));
    await waitFor(() =>
      expect(mockService.setBudget).toHaveBeenCalledWith(
        { householdId: 'h-1', userId: 'u-1', target: 'personal' },
        450,
      ),
    );
    expect(mockService.setBudget).toHaveBeenCalledTimes(1);
    expect(mockService.clearBudget).not.toHaveBeenCalled();
  });

  it('accepts comma decimals', async () => {
    render(<BudgetScreen />);
    await waitFor(() => expect(mockService.budgets).toHaveBeenCalled());
    fireEvent.changeText(screen.getByLabelText('Household budget amount'), '6,40');
    fireEvent.press(screen.getByText('Save'));
    await waitFor(() =>
      expect(mockService.setBudget).toHaveBeenCalledWith(
        { householdId: 'h-1', userId: 'u-1', target: 'household' },
        6.4,
      ),
    );
  });

  it('clears a budget emptied in the sheet', async () => {
    mockService.budgets.mockResolvedValue({
      household: budget('household', 640),
      personal: null,
    });
    render(<BudgetScreen />);
    await waitFor(() =>
      expect(screen.getByLabelText('Household budget amount')).toHaveProp('value', '640'),
    );
    fireEvent.changeText(screen.getByLabelText('Household budget amount'), '');
    fireEvent.press(screen.getByText('Save'));
    await waitFor(() =>
      expect(mockService.clearBudget).toHaveBeenCalledWith({
        householdId: 'h-1',
        userId: 'u-1',
        target: 'household',
      }),
    );
    expect(mockService.setBudget).not.toHaveBeenCalled();
  });

  it('rejects zero with inline copy', async () => {
    render(<BudgetScreen />);
    await waitFor(() => expect(mockService.budgets).toHaveBeenCalled());
    fireEvent.changeText(screen.getByLabelText('Household budget amount'), '0');
    fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText('Enter an amount above zero.')).toBeOnTheScreen();
    expect(mockService.setBudget).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('surfaces save failures', async () => {
    mockService.setBudget.mockRejectedValue(new Error('down'));
    render(<BudgetScreen />);
    await waitFor(() => expect(mockService.budgets).toHaveBeenCalled());
    fireEvent.changeText(screen.getByLabelText('Personal cap amount'), '200');
    fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText("Couldn't save the budget. Try again.")).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });
});
