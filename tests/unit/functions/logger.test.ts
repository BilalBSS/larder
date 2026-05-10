import { describe, expect, it, vi } from 'vitest';

import { makeServerLogger } from '../../../supabase/functions/_shared/logger';

function makeDeps() {
  const log = vi.fn<(s: string) => void>();
  const warn = vi.fn<(s: string) => void>();
  const error = vi.fn<(s: string) => void>();
  return { deps: { console: { log, warn, error } }, log, warn, error };
}

function lastJson(fn: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const call = fn.mock.calls.at(-1);
  if (call === undefined) throw new Error('expected at least one call');
  const arg = call[0];
  if (typeof arg !== 'string') throw new Error('expected string argument');
  return JSON.parse(arg) as Record<string, unknown>;
}

describe('makeServerLogger', () => {
  it('emits info as json', () => {
    const { deps, log } = makeDeps();
    makeServerLogger(deps).info('hi', { route: '/x' });
    expect(lastJson(log)).toMatchObject({ level: 'info', message: 'hi', route: '/x' });
  });

  it('child binds fields', () => {
    const { deps, log } = makeDeps();
    makeServerLogger(deps).child({ user_id: 'u-1' }).info('hi');
    expect(lastJson(log)).toMatchObject({ user_id: 'u-1' });
  });

  it('error logs message and stringified error', () => {
    const { deps, error } = makeDeps();
    makeServerLogger(deps).error('boom', new Error('oops'));
    expect(lastJson(error)).toMatchObject({ level: 'error', message: 'boom', error: 'oops' });
  });

  it('error handles non-Error throwable', () => {
    const { deps, error } = makeDeps();
    makeServerLogger(deps).error('boom', { custom: true });
    const payload = lastJson(error);
    expect(payload.error).toBe('[object Object]');
  });
});
