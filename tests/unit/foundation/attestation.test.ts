import { beforeEach, describe, expect, it, vi } from 'vitest';

import { attest } from '@foundation/abuse/attestation';

const { platform } = vi.hoisted(() => ({
  platform: { OS: 'ios' as 'ios' | 'android' | 'web' },
}));
vi.mock('react-native', () => ({ Platform: platform }));

describe('attest', () => {
  beforeEach(() => {
    platform.OS = 'ios';
  });

  it('returns stub token bound to challenge', async () => {
    const result = await attest('nonce-xyz');
    expect(result.token).toBe('dev-stub:nonce-xyz');
    expect(result.platform).toBe('ios');
    expect(result.issued_at).toBeGreaterThan(0);
  });

  it('produces fresh issued_at per call', async () => {
    const first = await attest('a');
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await attest('b');
    expect(second.issued_at).toBeGreaterThanOrEqual(first.issued_at);
  });

  it('maps android and web platforms', async () => {
    platform.OS = 'android';
    expect((await attest('x')).platform).toBe('android');
    platform.OS = 'web';
    expect((await attest('y')).platform).toBe('web');
  });
});
