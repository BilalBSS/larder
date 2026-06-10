// / jwt user extraction
import type { AuthUser } from './types.ts';

export class InvalidAuth extends Error {
  constructor(reason: string) {
    super(`invalid_auth:${reason}`);
    this.name = 'InvalidAuth';
  }
}

export interface ExtractUserOptions {
  readonly now?: () => number;
}

export function extractUser(authHeader: string | null, opts: ExtractUserOptions = {}): AuthUser {
  if (authHeader === null) throw new InvalidAuth('missing');
  const match = /^Bearer (.+)$/.exec(authHeader);
  if (match === null) throw new InvalidAuth('format');
  const token = match[1];
  if (token === undefined) throw new InvalidAuth('format');
  const parts = token.split('.');
  if (parts.length !== 3) throw new InvalidAuth('shape');
  const payloadB64 = parts[1];
  if (payloadB64 === undefined) throw new InvalidAuth('shape');
  let payload: unknown;
  try {
    payload = JSON.parse(decodeBase64Url(payloadB64));
  } catch {
    throw new InvalidAuth('payload');
  }
  if (typeof payload !== 'object' || payload === null) throw new InvalidAuth('payload');
  const claims = payload as { sub?: unknown; exp?: unknown };
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) throw new InvalidAuth('sub');
  if (typeof claims.exp !== 'number') throw new InvalidAuth('exp');
  const nowMs = opts.now === undefined ? Date.now() : opts.now();
  if (claims.exp * 1000 <= nowMs) throw new InvalidAuth('expired');
  return { id: claims.sub };
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}
