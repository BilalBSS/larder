import { describe, expect, it, vi } from 'vitest';

import { makeServerLogger } from '../../../supabase/functions/_shared/logger';
import { check } from '../../../supabase/functions/_shared/ratelimit';

function silentLogger() {
  return makeServerLogger({ console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } });
}

function makeRedis(incrResult: number | Error) {
  const incr =
    incrResult instanceof Error
      ? vi.fn().mockRejectedValue(incrResult)
      : vi.fn().mockResolvedValue(incrResult);
  const expire = vi.fn().mockResolvedValue(1);
  return { incr, expire };
}

const OPTS = { key: 'rl:user:1', windowSeconds: 60, maxPerWindow: 5 };

describe('ratelimit.check', () => {
  it('allows the first call and sets the expiry', async () => {
    const redis = makeRedis(1);
    const result = await check({ redis, logger: silentLogger() }, OPTS);
    expect(result).toEqual({ allowed: true });
    expect(redis.expire).toHaveBeenCalledWith('rl:user:1', 60);
  });

  it('allows further calls under the cap without re-setting expiry', async () => {
    const redis = makeRedis(3);
    const result = await check({ redis, logger: silentLogger() }, OPTS);
    expect(result.allowed).toBe(true);
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('blocks when count exceeds the cap', async () => {
    const redis = makeRedis(6);
    const result = await check({ redis, logger: silentLogger() }, OPTS);
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('fails open when redis is unreachable', async () => {
    const redis = makeRedis(new Error('connection refused'));
    const result = await check({ redis, logger: silentLogger() }, OPTS);
    expect(result).toEqual({ allowed: true });
  });
});
