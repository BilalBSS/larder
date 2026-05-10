import { describe, expect, it, vi } from 'vitest';

import { attest } from '@foundation/abuse/attestation';

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

describe('attest', () => {
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
});
