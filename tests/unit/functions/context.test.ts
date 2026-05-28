import { describe, expect, it, vi } from 'vitest';

import { AttestationFailed } from '../../../supabase/functions/_shared/attestation';
import { makeRequestContext } from '../../../supabase/functions/_shared/context';
import { makeServerLogger } from '../../../supabase/functions/_shared/logger';

const NOW = 1_715_000_000_000;

function silentLogger() {
  return makeServerLogger({ console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } });
}

function makeJwt(payload: Record<string, unknown>): string {
  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.sig`;
}

function makeHeaders(extra: Record<string, string> = {}): Headers {
  return new Headers({ authorization: `Bearer ${makeJwt({ sub: 'user-1' })}`, ...extra });
}

const STUB = JSON.stringify({ platform: 'ios', token: 'dev-stub:n', issued_at: NOW });

describe('makeRequestContext', () => {
  it('builds context and reads idempotency key when attestation is off', () => {
    const ctx = makeRequestContext({
      headers: makeHeaders({ 'idempotency-key': 'k1' }),
      baseLogger: silentLogger(),
      attestation: { enforced: false, allowDevStub: false },
    });
    expect(ctx.user.id).toBe('user-1');
    expect(ctx.idempotencyKey).toBe('k1');
  });

  it('accepts a fresh dev stub when enforced and stubs allowed', () => {
    const ctx = makeRequestContext({
      headers: makeHeaders({ 'x-attestation': STUB }),
      baseLogger: silentLogger(),
      attestation: { enforced: true, allowDevStub: true },
      now: () => NOW,
    });
    expect(ctx.user.id).toBe('user-1');
  });

  it('throws AttestationFailed when enforced and header is absent', () => {
    expect(() =>
      makeRequestContext({
        headers: makeHeaders(),
        baseLogger: silentLogger(),
        attestation: { enforced: true, allowDevStub: true },
        now: () => NOW,
      }),
    ).toThrow(AttestationFailed);
  });

  it('throws AttestationFailed when a dev stub is presented but disallowed', () => {
    expect(() =>
      makeRequestContext({
        headers: makeHeaders({ 'x-attestation': STUB }),
        baseLogger: silentLogger(),
        attestation: { enforced: true, allowDevStub: false },
        now: () => NOW,
      }),
    ).toThrow(AttestationFailed);
  });
});
