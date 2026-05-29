import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Onboarding from '@/app/(auth)/onboarding';
import { inviteService } from '@domain/use-cases/invite/service';
import { useRefreshUser } from '@foundation/context';

jest.mock('@domain/use-cases/invite/service', () => ({
  inviteService: { createHousehold: jest.fn(), accept: jest.fn() },
}));

const mockRefreshUser = jest.fn(async () => {});

jest.mock('@foundation/context', () => ({
  useRefreshUser: jest.fn(() => mockRefreshUser),
  useLogger: jest.fn(() => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() })),
}));

const createHousehold = inviteService.createHousehold as jest.Mock;
const accept = inviteService.accept as jest.Mock;

const UUID = '11111111-2222-4333-8444-555555555555';

beforeEach(() => {
  jest.clearAllMocks();
  (useRefreshUser as jest.Mock).mockReturnValue(mockRefreshUser);
});

describe('Onboarding create household', () => {
  it('requires a name', () => {
    render(<Onboarding />);
    fireEvent.press(screen.getByRole('button', { name: 'Create household' }));
    expect(screen.getByText('Give your household a name.')).toBeOnTheScreen();
    expect(createHousehold).not.toHaveBeenCalled();
  });

  it('creates the household then refreshes', async () => {
    createHousehold.mockResolvedValue('h-1');
    render(<Onboarding />);
    fireEvent.changeText(screen.getByLabelText('household name'), '  The Flat ');
    fireEvent.press(screen.getByLabelText('Couple'));
    fireEvent.press(screen.getByRole('button', { name: 'Create household' }));
    await waitFor(() =>
      expect(createHousehold).toHaveBeenCalledWith({ name: 'The Flat', type: 'couple' }),
    );
    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it('surfaces a failure to create', async () => {
    createHousehold.mockRejectedValue(new Error('boom'));
    render(<Onboarding />);
    fireEvent.changeText(screen.getByLabelText('household name'), 'The Flat');
    fireEvent.press(screen.getByRole('button', { name: 'Create household' }));
    expect(
      await screen.findByText('Could not create your household. Try again.'),
    ).toBeOnTheScreen();
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it('creates only once when pressed twice', async () => {
    let resolve: (value: string) => void = () => {};
    createHousehold.mockReturnValue(new Promise<string>((r) => (resolve = r)));
    render(<Onboarding />);
    fireEvent.changeText(screen.getByLabelText('household name'), 'The Flat');
    const button = screen.getByRole('button', { name: 'Create household' });
    fireEvent.press(button);
    fireEvent.press(button);
    expect(createHousehold).toHaveBeenCalledTimes(1);
    resolve('h-1');
    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
  });
});

describe('Onboarding join with token', () => {
  async function paste(link: string) {
    render(<Onboarding />);
    fireEvent.press(screen.getByLabelText('I have an invite'));
    fireEvent.changeText(screen.getByLabelText('invite link'), link);
    fireEvent.press(screen.getByRole('button', { name: 'Join household' }));
  }

  it('accepts a full invite link then refreshes', async () => {
    accept.mockResolvedValue('h-2');
    await paste(`larder://join/${UUID}`);
    await waitFor(() => expect(accept).toHaveBeenCalledWith(UUID));
    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it.each([
    ['full link', `larder://join/${UUID}`],
    ['bare uuid', UUID],
    ['surrounding whitespace', `  ${UUID}  `],
  ])('extracts the token from %s', async (_label, input) => {
    accept.mockResolvedValue('h-2');
    await paste(input);
    await waitFor(() => expect(accept).toHaveBeenCalledWith(UUID));
  });

  it('rejects a trailing-slash link before calling accept', async () => {
    await paste(`larder://join/${UUID}/`);
    expect(await screen.findByText("That doesn't look like an invite link.")).toBeOnTheScreen();
    expect(accept).not.toHaveBeenCalled();
  });

  it('rejects a malformed token before calling accept', async () => {
    await paste('tok-9');
    expect(await screen.findByText("That doesn't look like an invite link.")).toBeOnTheScreen();
    expect(accept).not.toHaveBeenCalled();
  });

  it('maps an expired invite to a clear message', async () => {
    accept.mockRejectedValue(new Error('invite_expired'));
    await paste(UUID);
    expect(
      await screen.findByText('This invite has expired. Ask for a new one.'),
    ).toBeOnTheScreen();
  });

  it('accepts only once when pressed twice', async () => {
    let resolve: (value: string) => void = () => {};
    accept.mockReturnValue(new Promise<string>((r) => (resolve = r)));
    render(<Onboarding />);
    fireEvent.press(screen.getByLabelText('I have an invite'));
    fireEvent.changeText(screen.getByLabelText('invite link'), UUID);
    const button = screen.getByRole('button', { name: 'Join household' });
    fireEvent.press(button);
    fireEvent.press(button);
    expect(accept).toHaveBeenCalledTimes(1);
    resolve('h-2');
    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
  });
});
