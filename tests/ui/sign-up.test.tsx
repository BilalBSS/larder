import { fireEvent, render, screen } from '@testing-library/react-native';

import SignUp from '@/app/(auth)/sign-up';
import { supabase } from '@foundation/auth/supabase';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return { Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text> };
});

jest.mock('@foundation/auth/supabase', () => ({
  supabase: { auth: { signUp: jest.fn() } },
}));

const signUp = supabase.auth.signUp as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function fill(email: string, password: string) {
  fireEvent.changeText(screen.getByLabelText('email'), email);
  fireEvent.changeText(screen.getByLabelText('password'), password);
}

describe('SignUp', () => {
  it('requires an email and password before calling supabase', () => {
    render(<SignUp />);
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Enter your email and password.')).toBeOnTheScreen();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('rejects a short password before calling supabase', () => {
    render(<SignUp />);
    fill('a@b.com', '123');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Use at least 6 characters.')).toBeOnTheScreen();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('maps a network failure', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: { message: 'Network error' } });
    render(<SignUp />);
    fill('a@b.com', 'secret1');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Connection problem. Try again.')).toBeOnTheScreen();
  });

  it('maps a weak-password rejection from supabase', async () => {
    signUp.mockResolvedValue({
      data: { session: null },
      error: { message: 'Password should be stronger' },
    });
    render(<SignUp />);
    fill('a@b.com', 'secret1');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use at least 6 characters.')).toBeOnTheScreen();
  });

  it('falls back for an unexpected sign-up error', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: { message: 'teapot' } });
    render(<SignUp />);
    fill('a@b.com', 'secret1');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Could not create your account. Try again.')).toBeOnTheScreen();
  });

  it('shows the check-email state when no session is returned', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<SignUp />);
    fill('new@b.com', 'secret1');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Check your email')).toBeOnTheScreen();
    expect(screen.getByText(/new@b.com/)).toBeOnTheScreen();
  });

  it('reports an already-registered email', async () => {
    signUp.mockResolvedValue({
      data: { session: null },
      error: { message: 'User already registered' },
    });
    render(<SignUp />);
    fill('taken@b.com', 'secret1');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText('That email is already registered. Try signing in.'),
    ).toBeOnTheScreen();
  });

  it('stays on the form when a session is returned', async () => {
    signUp.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } }, error: null });
    render(<SignUp />);
    fill('new@b.com', 'secret1');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('button', { name: 'Create account' })).toBeOnTheScreen();
    expect(screen.queryByText('Check your email')).toBeNull();
  });

  it('signs up only once when pressed twice', async () => {
    let resolve: (value: { data: { session: null }; error: null }) => void = () => {};
    signUp.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<SignUp />);
    fill('new@b.com', 'secret1');
    const button = screen.getByRole('button', { name: 'Create account' });
    fireEvent.press(button);
    fireEvent.press(button);
    expect(signUp).toHaveBeenCalledTimes(1);
    resolve({ data: { session: null }, error: null });
    await screen.findByText('Check your email');
  });
});
