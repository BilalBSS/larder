import { describe, expect, it } from 'vitest';

import { extractUser, InvalidAuth } from '../../../supabase/functions/_shared/auth';

function makeJwt(payload: Record<string, unknown>): string {
  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ exp: 4_000_000_000, ...payload })}.sig`;
}

describe('extractUser', () => {
  it('returns id from a valid Bearer jwt', () => {
    const jwt = makeJwt({ sub: 'user-123' });
    expect(extractUser(`Bearer ${jwt}`)).toEqual({ id: 'user-123' });
  });

  it('throws InvalidAuth when header is missing', () => {
    expect(() => extractUser(null)).toThrow(InvalidAuth);
  });

  it('throws InvalidAuth when prefix is wrong', () => {
    expect(() => extractUser('Basic abc')).toThrow(InvalidAuth);
  });

  it('throws InvalidAuth when token is malformed', () => {
    expect(() => extractUser('Bearer abc')).toThrow(InvalidAuth);
  });

  it('throws InvalidAuth when payload is not base64 json', () => {
    expect(() => extractUser('Bearer header.notbase64!.sig')).toThrow(InvalidAuth);
  });

  it('throws InvalidAuth when sub claim is missing', () => {
    const jwt = makeJwt({ email: 'x@y.z' });
    expect(() => extractUser(`Bearer ${jwt}`)).toThrow(InvalidAuth);
  });

  it('throws InvalidAuth when sub claim is empty', () => {
    const jwt = makeJwt({ sub: '' });
    expect(() => extractUser(`Bearer ${jwt}`)).toThrow(InvalidAuth);
  });

  it('throws InvalidAuth when exp claim is missing', () => {
    const jwt = makeJwt({ sub: 'user-1', exp: undefined });
    expect(() => extractUser(`Bearer ${jwt}`)).toThrow(InvalidAuth);
  });

  it('throws InvalidAuth when exp claim is not a number', () => {
    const jwt = makeJwt({ sub: 'user-1', exp: 'soon' });
    expect(() => extractUser(`Bearer ${jwt}`)).toThrow(InvalidAuth);
  });

  it('throws InvalidAuth when token is expired', () => {
    const jwt = makeJwt({ sub: 'user-1', exp: 1_000 });
    expect(() => extractUser(`Bearer ${jwt}`, { now: () => 2_000_000 })).toThrow(InvalidAuth);
  });

  it('accepts a token whose exp is in the future', () => {
    const jwt = makeJwt({ sub: 'user-1', exp: 5_000 });
    expect(extractUser(`Bearer ${jwt}`, { now: () => 1_000_000 })).toEqual({ id: 'user-1' });
  });
});
