// / server attestation verifier
import type { AttestationToken } from './types.ts';

const DEV_STUB_PREFIX = 'dev-stub:';
const MAX_TOKEN_AGE_MS = 5 * 60 * 1000;

export class AttestationFailed extends Error {
  constructor() {
    super('attestation_failed');
    this.name = 'AttestationFailed';
  }
}

export interface VerifyOptions {
  readonly allowDevStub: boolean;
  readonly now?: () => number;
}

export function verifyAttestation(raw: unknown, opts: VerifyOptions): raw is AttestationToken {
  if (typeof raw !== 'object' || raw === null) return false;
  const t = raw as Partial<AttestationToken>;
  if (typeof t.token !== 'string') return false;
  if (t.platform !== 'ios' && t.platform !== 'android' && t.platform !== 'web') return false;
  if (typeof t.issued_at !== 'number') return false;
  const now = opts.now === undefined ? Date.now() : opts.now();
  if (now - t.issued_at > MAX_TOKEN_AGE_MS) return false;
  if (t.token.startsWith(DEV_STUB_PREFIX)) return opts.allowDevStub;
  return false;
}
