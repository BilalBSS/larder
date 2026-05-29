import { resolveGate } from '@/app/resolve-gate';

describe('resolveGate', () => {
  it('holds on the splash while auth is loading', () => {
    expect(resolveGate('loading', false)).toBe('loading');
    expect(resolveGate('loading', true)).toBe('loading');
  });

  it('routes an anonymous visitor to auth', () => {
    expect(resolveGate('anon', false)).toBe('auth');
  });

  it('ignores a stale household flag while anonymous', () => {
    expect(resolveGate('anon', true)).toBe('auth');
  });

  it('routes an authed user without a household to onboarding', () => {
    expect(resolveGate('authed', false)).toBe('onboarding');
  });

  it('routes an authed user with a household to tabs', () => {
    expect(resolveGate('authed', true)).toBe('tabs');
  });
});
