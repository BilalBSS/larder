import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import Welcome from '@/app/(auth)/welcome';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn() },
    Link: ({ children }: { children: ReactNode }) => <Text>{children}</Text>,
  };
});

const push = router.push as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Welcome', () => {
  it('shows the hero and the daily-loop bullets', () => {
    render(<Welcome />);
    expect(screen.getByText('The pantry app for households who actually cook.')).toBeOnTheScreen();
    expect(screen.getByText('Scan')).toBeOnTheScreen();
    expect(screen.getByText('Cook')).toBeOnTheScreen();
    expect(screen.getByText('Settle')).toBeOnTheScreen();
  });

  it('starts sign-up from get started', () => {
    render(<Welcome />);
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    expect(push).toHaveBeenCalledWith('/sign-up');
  });
});
