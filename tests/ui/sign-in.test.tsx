import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SignIn from '@/app/(auth)/sign-in';
import { supabase } from '@foundation/auth/supabase';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return { Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text> };
});

jest.mock('@foundation/auth/supabase', () => ({
  supabase: { auth: { signInWithPassword: jest.fn() } },
}));

const signIn = supabase.auth.signInWithPassword as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SignIn', () => {
  it('requires an email and password', () => {
    render(<SignIn />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email and password.')).toBeOnTheScreen();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('shows an invalid-credentials message', async () => {
    signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<SignIn />);
    fireEvent.changeText(screen.getByLabelText('email'), 'a@b.com');
    fireEvent.changeText(screen.getByLabelText('password'), 'wrongpass');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('That email or password is incorrect.')).toBeOnTheScreen();
  });

  it('shows a network error message', async () => {
    signIn.mockResolvedValue({ error: { message: 'Network request failed' } });
    render(<SignIn />);
    fireEvent.changeText(screen.getByLabelText('email'), 'a@b.com');
    fireEvent.changeText(screen.getByLabelText('password'), 'secret1');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Connection problem. Try again.')).toBeOnTheScreen();
  });

  it('calls supabase with trimmed credentials on success', async () => {
    signIn.mockResolvedValue({ error: null });
    render(<SignIn />);
    fireEvent.changeText(screen.getByLabelText('email'), '  a@b.com ');
    fireEvent.changeText(screen.getByLabelText('password'), 'secret1');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret1' }),
    );
  });
});
