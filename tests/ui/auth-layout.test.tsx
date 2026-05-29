import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import AuthLayout from '@/app/(auth)/_layout';
import { useAuthStatus } from '@foundation/context';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const Stack = ({ children }: { children: ReactNode }) => <>{children}</>;
  const Screen = ({ name }: { name: string }) => <Text>{name}</Text>;
  const Protected = ({ guard, children }: { guard: boolean; children: ReactNode }) =>
    guard ? <>{children}</> : null;
  Stack.Screen = Screen;
  Stack.Protected = Protected;
  return { Stack };
});

jest.mock('@foundation/context', () => ({ useAuthStatus: jest.fn() }));

const setStatus = (status: string) => (useAuthStatus as jest.Mock).mockReturnValue(status);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthLayout', () => {
  it('exposes onboarding to an authed user, not the sign-in screens', () => {
    setStatus('authed');
    render(<AuthLayout />);
    expect(screen.getByText('onboarding')).toBeOnTheScreen();
    expect(screen.queryByText('sign-in')).toBeNull();
    expect(screen.queryByText('sign-up')).toBeNull();
  });

  it('exposes the sign-in screens to an anonymous visitor, not onboarding', () => {
    setStatus('anon');
    render(<AuthLayout />);
    expect(screen.getByText('sign-in')).toBeOnTheScreen();
    expect(screen.getByText('sign-up')).toBeOnTheScreen();
    expect(screen.queryByText('onboarding')).toBeNull();
  });

  it('always exposes the deep-link join route', () => {
    setStatus('anon');
    render(<AuthLayout />);
    expect(screen.getByText('join/[token]')).toBeOnTheScreen();
  });
});
