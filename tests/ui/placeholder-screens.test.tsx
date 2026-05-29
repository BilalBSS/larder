import { render, screen } from '@testing-library/react-native';

import PantryScreen from '@/app/(tabs)/index';
import CookScreen from '@/app/(tabs)/cook';
import SpendingScreen from '@/app/(tabs)/spending';
import YouScreen from '@/app/(tabs)/you';
import { useUser } from '@foundation/context';

jest.mock('@foundation/context', () => ({ useUser: jest.fn() }));

const mockUseUser = useUser as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PantryScreen', () => {
  it('renders the first-run empty state', () => {
    render(<PantryScreen />);
    expect(screen.getByText("Let's stock the pantry.")).toBeOnTheScreen();
    expect(screen.getByText('Snap a receipt to start.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Scan a receipt' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add by hand' })).toBeOnTheScreen();
  });
});

describe('CookScreen', () => {
  it('renders its placeholder empty state', () => {
    render(<CookScreen />);
    expect(screen.getByText('Cook')).toBeOnTheScreen();
    expect(screen.getByText('Cooking is coming soon.')).toBeOnTheScreen();
  });
});

describe('SpendingScreen', () => {
  it('renders its placeholder empty state', () => {
    render(<SpendingScreen />);
    expect(screen.getByText('Spending')).toBeOnTheScreen();
    expect(screen.getByText('Spending is coming soon.')).toBeOnTheScreen();
  });
});

describe('YouScreen', () => {
  it('renders its placeholder empty state', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    render(<YouScreen />);
    expect(screen.getByText('You')).toBeOnTheScreen();
    expect(screen.getByText('Settings are coming soon.')).toBeOnTheScreen();
  });

  it('shows the signed-in household state', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: 'h-1', tier: 'free' });
    render(<YouScreen />);
    expect(screen.getByText('In a household')).toBeOnTheScreen();
  });

  it('shows the no-household state', () => {
    mockUseUser.mockReturnValue({ id: 'u-1', household_id: null, tier: 'free' });
    render(<YouScreen />);
    expect(screen.getByText('No household yet')).toBeOnTheScreen();
  });
});
