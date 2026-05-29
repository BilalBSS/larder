import { render, screen, waitFor } from '@testing-library/react-native';

import JoinInvite from '@/app/(auth)/join/[token]';
import { inviteService } from '@domain/use-cases/invite/service';
import { useAuthStatus } from '@foundation/context';
import { setPendingInvite } from '@/app/(auth)/pending-invite';

const mockReplace = jest.fn();
let mockParams: { token?: string } = { token: 'tok-1' };

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@domain/use-cases/invite/service', () => ({
  inviteService: { accept: jest.fn() },
}));

const mockRefreshUser = jest.fn(async () => {});

jest.mock('@foundation/context', () => ({
  useAuthStatus: jest.fn(),
  useRefreshUser: jest.fn(() => mockRefreshUser),
  useLogger: jest.fn(() => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() })),
}));

jest.mock('@/app/(auth)/pending-invite', () => ({
  setPendingInvite: jest.fn(async () => {}),
}));

const accept = inviteService.accept as jest.Mock;
const setStatus = (status: string) => (useAuthStatus as jest.Mock).mockReturnValue(status);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { token: 'tok-1' };
});

describe('JoinInvite', () => {
  it('accepts the invite and refreshes when authed', async () => {
    setStatus('authed');
    accept.mockResolvedValue('h-1');
    render(<JoinInvite />);
    await waitFor(() => expect(accept).toHaveBeenCalledWith('tok-1'));
    expect(mockRefreshUser).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('stashes the token and routes to sign-in when anon', async () => {
    setStatus('anon');
    render(<JoinInvite />);
    await waitFor(() => expect(setPendingInvite).toHaveBeenCalledWith('tok-1'));
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
    expect(accept).not.toHaveBeenCalled();
  });

  it('does nothing while auth is loading', async () => {
    setStatus('loading');
    render(<JoinInvite />);
    await waitFor(() => expect(screen.getByText('Joining the household…')).toBeOnTheScreen());
    expect(accept).not.toHaveBeenCalled();
    expect(setPendingInvite).not.toHaveBeenCalled();
  });

  it('shows an expired message', async () => {
    setStatus('authed');
    accept.mockRejectedValue(new Error('invite_expired'));
    render(<JoinInvite />);
    expect(
      await screen.findByText('This invite has expired. Ask for a new one.'),
    ).toBeOnTheScreen();
  });

  it('shows an already-used message', async () => {
    setStatus('authed');
    accept.mockRejectedValue(new Error('invite_already_accepted'));
    render(<JoinInvite />);
    expect(await screen.findByText('This invite has already been used.')).toBeOnTheScreen();
  });

  it('reports a missing code when the token is absent', async () => {
    setStatus('authed');
    mockParams = {};
    render(<JoinInvite />);
    expect(await screen.findByText('That invite link is missing its code.')).toBeOnTheScreen();
    expect(accept).not.toHaveBeenCalled();
  });

  it('still routes to sign-in when stashing the token fails', async () => {
    setStatus('anon');
    (setPendingInvite as jest.Mock).mockRejectedValue(new Error('disk full'));
    render(<JoinInvite />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sign-in'));
  });
});
