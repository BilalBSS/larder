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

  it('clears the token on a terminal error', async () => {
    const d = deps('tok-7');
    d.accept.mockRejectedValue(new Error('invite_expired'));
    await expect(makeResolvePendingInvite(d)('u-1')).rejects.toThrow('invite_expired');
    expect(d.clearToken).toHaveBeenCalled();
  });

  it('keeps the token on a transient error', async () => {
    const d = deps('tok-7');
    d.accept.mockRejectedValue(new Error('invite_accept_failed'));
    await expect(makeResolvePendingInvite(d)('u-1')).rejects.toThrow('invite_accept_failed');
    expect(d.clearToken).not.toHaveBeenCalled();
  });
});
