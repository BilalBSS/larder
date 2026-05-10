// / jwt user extraction
import type { AuthUser } from './types';

export class InvalidAuth extends Error {
  constructor(reason: string) {
    super(`invalid_auth:${reason}`);
    this.name = 'InvalidAuth';
  }
}

export function extractUser(authHeader: string | null): AuthUser {
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
  const sub = (payload as { sub?: unknown }).sub;
  if (typeof sub !== 'string' || sub.length === 0) throw new InvalidAuth('sub');
  return { id: sub };
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}
