import { inviteMessage } from '@/src/shell/invite-copy';

describe('inviteMessage', () => {
  it('maps an expired invite', () => {
    expect(inviteMessage(new Error('invite_expired'))).toBe(
      'This invite has expired. Ask for a new one.',
    );
  });

  it('maps an already-accepted invite', () => {
    expect(inviteMessage(new Error('invite_already_accepted'))).toBe(
      'This invite has already been used.',
    );
  });

  it('maps a missing invite', () => {
    expect(inviteMessage(new Error('invite_not_found'))).toBe('We could not find that invite.');
  });

  it('falls back for an unknown error', () => {
    expect(inviteMessage(new Error('boom'))).toBe('Could not join. Check the link and try again.');
  });

  it('falls back for a non-error value', () => {
    expect(inviteMessage('weird')).toBe('Could not join. Check the link and try again.');
  });
});
