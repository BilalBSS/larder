import { makeResolvePendingInvite } from '@/app/(auth)/resolve-pending-invite';

function deps(token: string | null) {
  return {
    accept: jest.fn(async () => 'h-1'),
    getToken: jest.fn(async () => token),
    clearToken: jest.fn(async () => {}),
  };
}

describe('makeResolvePendingInvite', () => {
  it('does nothing when no token is stored', async () => {
    const d = deps(null);
    await makeResolvePendingInvite(d)('u-1');
    expect(d.accept).not.toHaveBeenCalled();
    expect(d.clearToken).not.toHaveBeenCalled();
  });

  it('accepts then clears a stored token', async () => {
    const d = deps('tok-7');
    await makeResolvePendingInvite(d)('u-1');
    expect(d.accept).toHaveBeenCalledWith('tok-7');
    expect(d.clearToken).toHaveBeenCalled();
  });

  it('leaves the token in place when accept fails', async () => {
    const d = deps('tok-7');
    d.accept.mockRejectedValue(new Error('invite_expired'));
    await expect(makeResolvePendingInvite(d)('u-1')).rejects.toThrow('invite_expired');
    expect(d.clearToken).not.toHaveBeenCalled();
  });
});
