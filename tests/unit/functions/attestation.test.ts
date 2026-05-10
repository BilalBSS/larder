import { describe, expect, it } from 'vitest';

import { verifyAttestation } from '../../../supabase/functions/_shared/attestation';

const now = 1_715_000_000_000;
const fresh = { platform: 'ios', token: 'dev-stub:nonce', issued_at: now } as const;

describe('verifyAttestation', () => {
  it('accepts a fresh dev stub when allowed', () => {
    expect(verifyAttestation(fresh, { allowDevStub: true, now: () => now })).toBe(true);
  });

  it('rejects a dev stub when not allowed', () => {
    expect(verifyAttestation(fresh, { allowDevStub: false, now: () => now })).toBe(false);
  });

  it('rejects unknown token shapes', () => {
    expect(verifyAttestation('not-an-object', { allowDevStub: true })).toBe(false);
    expect(verifyAttestation(null, { allowDevStub: true })).toBe(false);
    expect(verifyAttestation({}, { allowDevStub: true })).toBe(false);
  });

  it('rejects unknown platform', () => {
    expect(
      verifyAttestation({ ...fresh, platform: 'fridge' }, { allowDevStub: true, now: () => now }),
    ).toBe(false);
  });

  it('rejects stale tokens', () => {
    const stale = { ...fresh, issued_at: now - 10 * 60 * 1000 };
    expect(verifyAttestation(stale, { allowDevStub: true, now: () => now })).toBe(false);
  });

  it('rejects non-stub tokens until real verifier lands', () => {
    expect(
      verifyAttestation(
        { ...fresh, token: 'real-app-attest-token' },
        { allowDevStub: true, now: () => now },
      ),
    ).toBe(false);
  });
});
