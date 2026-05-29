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
});

describe('Onboarding join with token', () => {
  it('accepts a pasted invite link then refreshes', async () => {
    accept.mockResolvedValue('h-2');
    render(<Onboarding />);
    fireEvent.press(screen.getByLabelText('I have an invite'));
    fireEvent.changeText(screen.getByLabelText('invite link'), 'larder://join/tok-123');
    fireEvent.press(screen.getByRole('button', { name: 'Join household' }));
    await waitFor(() => expect(accept).toHaveBeenCalledWith('tok-123'));
    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it('maps an expired invite to a clear message', async () => {
    accept.mockRejectedValue(new Error('invite_expired'));
    render(<Onboarding />);
    fireEvent.press(screen.getByLabelText('I have an invite'));
    fireEvent.changeText(screen.getByLabelText('invite link'), 'tok-9');
    fireEvent.press(screen.getByRole('button', { name: 'Join household' }));
    expect(
      await screen.findByText('This invite has expired. Ask for a new one.'),
    ).toBeOnTheScreen();
  });
});
