import { describe, expect, it, vi } from 'vitest';

import { makeLogger, type LoggerDeps } from '@foundation/monitoring/logger';

function makeDeps() {
  const log = vi.fn<(s: string) => void>();
  const warn = vi.fn<(s: string) => void>();
  const error = vi.fn<(s: string) => void>();
  const onError = vi.fn<(err: unknown, tags: Record<string, string>) => void>();
  const deps: LoggerDeps = { console: { log, warn, error }, onError };
  return { deps, log, warn, error, onError };
}

function lastJson(fn: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const call = fn.mock.calls.at(-1);
  if (call === undefined) throw new Error('expected at least one call');
  const arg = call[0];
  if (typeof arg !== 'string') throw new Error('expected string argument');
  return JSON.parse(arg) as Record<string, unknown>;
}

describe('makeLogger', () => {
  it('emits info as json', () => {
    const { deps, log } = makeDeps();
    makeLogger(deps).info('hello', { foo: 'bar' });
    expect(log).toHaveBeenCalledOnce();
    expect(lastJson(log)).toMatchObject({ level: 'info', message: 'hello', foo: 'bar' });
  });

  it('emits warn as json', () => {
    const { deps, warn } = makeDeps();
    makeLogger(deps).warn('careful');
    expect(lastJson(warn)).toMatchObject({ level: 'warn', message: 'careful' });
  });

  it('child binds fields', () => {
    const { deps, log } = makeDeps();
    makeLogger(deps).child({ user_id: 'u-1' }).info('hi', { req_id: 'r-9' });
    expect(lastJson(log)).toMatchObject({ user_id: 'u-1', req_id: 'r-9', message: 'hi' });
  });

  it('error captures exception and includes message', () => {
    const { deps, error, onError } = makeDeps();
    const boom = new Error('boom');
    makeLogger(deps).error('fail', boom, { route: '/x' });
    expect(lastJson(error)).toMatchObject({ level: 'error', message: 'fail', error: 'boom' });
    expect(onError).toHaveBeenCalledWith(boom, { route: '/x' });
  });

  it('error without throwable does not capture', () => {
    const { deps, error, onError } = makeDeps();
    makeLogger(deps).error('fail');
    expect(error).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it('child merges bound fields into capture tags', () => {
    const { deps, onError } = makeDeps();
    makeLogger(deps).child({ user_id: 'u-1' }).error('fail', new Error('e'), { route: '/x' });
    expect(onError).toHaveBeenCalledWith(expect.any(Error), { user_id: 'u-1', route: '/x' });
  });

  it('non-error throwable stringified', () => {
    const { deps, error } = makeDeps();
    makeLogger(deps).error('fail', 'plain-string-fault');
    expect(lastJson(error)).toMatchObject({ error: 'plain-string-fault' });
  });
});
