// / request context constructor
import type { AuthUser } from './types';
import { extractUser } from './auth';
import { AttestationFailed, verifyAttestation, type VerifyOptions } from './attestation';
import type { ServerLogger } from './logger';

export interface RequestContext {
  readonly user: AuthUser;
  readonly logger: ServerLogger;
  readonly idempotencyKey: string | null;
}

export interface AttestationPolicy {
  readonly enforced: boolean;
  readonly allowDevStub: boolean;
}

export interface RequestContextDeps {
  readonly headers: Headers;
  readonly baseLogger: ServerLogger;
  readonly attestation: AttestationPolicy;
  readonly now?: () => number;
}

export function makeRequestContext(deps: RequestContextDeps): RequestContext {
  const user = extractUser(deps.headers.get('authorization'));
  if (deps.attestation.enforced) {
    const token = parseAttestation(deps.headers.get('x-attestation'));
    if (!verifyAttestation(token, attestationOptions(deps))) throw new AttestationFailed();
  }
  return {
    user,
    logger: deps.baseLogger.child({ user_id: user.id }),
    idempotencyKey: deps.headers.get('idempotency-key'),
  };
}

function parseAttestation(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function attestationOptions(deps: RequestContextDeps): VerifyOptions {
  return deps.now === undefined
    ? { allowDevStub: deps.attestation.allowDevStub }
    : { allowDevStub: deps.attestation.allowDevStub, now: deps.now };
}
