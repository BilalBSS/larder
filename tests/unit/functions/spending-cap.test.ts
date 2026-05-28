import { describe, expect, it, vi } from 'vitest';

import { makeServerLogger } from '../../../supabase/functions/_shared/logger';
import {
  precheck,
  record,
  SpendingCapExceeded,
  SpendingCapUnavailable,
} from '../../../supabase/functions/_shared/spending-cap';

function silentLogger() {
  return makeServerLogger({ console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } });
}

function makeRedis(values: number[]) {
  const queue = [...values];
  const incrBy = vi.fn(async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error('queue exhausted');
    return next;
  });
  const expire = vi.fn().mockResolvedValue(1);
  const get = vi.fn().mockResolvedValue(null);
  return { get, incrBy, expire };
}

function makeGetRedis(daily: number | null, monthly: number | null) {
  const get = vi.fn(async (key: string) => (key.includes(':d:') ? daily : monthly));
  return { get, incrBy: vi.fn(), expire: vi.fn() };
}

const CHECK = {
  user_id: 'u-1',
  daily_cap_cents: 500,
  monthly_cap_cents: 5000,
};

const OPTS = {
  user_id: 'u-1',
  amount_usd_cents: 50,
  daily_cap_cents: 500,
  monthly_cap_cents: 5000,
};

describe('spending-cap.record', () => {
  it('writes under cap silently', async () => {
    const redis = makeRedis([50, 50]);
    await expect(record({ redis, logger: silentLogger() }, OPTS)).resolves.toBeUndefined();
    expect(redis.incrBy).toHaveBeenCalledTimes(2);
    expect(redis.expire).toHaveBeenCalledTimes(2);
  });

  it('throws daily exceeded when daily counter passes cap', async () => {
    const redis = makeRedis([600, 600]);
    await expect(record({ redis, logger: silentLogger() }, OPTS)).rejects.toBeInstanceOf(
      SpendingCapExceeded,
    );
  });

  it('throws monthly exceeded when monthly counter passes cap', async () => {
    const redis = makeRedis([100, 6000]);
    await expect(record({ redis, logger: silentLogger() }, OPTS)).rejects.toMatchObject({
      scope: 'monthly',
    });
  });

  it('skips expire on non-fresh keys', async () => {
    const redis = makeRedis([150, 150]);
    await record({ redis, logger: silentLogger() }, OPTS);
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('rolls to a new daily key on day change', async () => {
    const redis = makeRedis([50, 50]);
    const dec18 = new Date('2026-12-18T23:59:59Z');
    await record({ redis, logger: silentLogger(), now: () => dec18 }, OPTS);
    expect(redis.incrBy).toHaveBeenCalledWith(expect.stringContaining('2026-12-18'), 50);
    expect(redis.incrBy).toHaveBeenCalledWith(expect.stringContaining('2026-12'), 50);
  });

  it('fails closed when redis throws', async () => {
    const redis = {
      get: vi.fn(),
      incrBy: vi.fn().mockRejectedValue(new Error('boom')),
      expire: vi.fn(),
    };
    await expect(record({ redis, logger: silentLogger() }, OPTS)).rejects.toBeInstanceOf(
      SpendingCapUnavailable,
    );
  });
});

describe('spending-cap.precheck', () => {
  it('resolves when both counters are under cap', async () => {
    const redis = makeGetRedis(100, 1000);
    await expect(precheck({ redis, logger: silentLogger() }, CHECK)).resolves.toBeUndefined();
  });

  it('treats absent counters as zero', async () => {
    const redis = makeGetRedis(null, null);
    await expect(precheck({ redis, logger: silentLogger() }, CHECK)).resolves.toBeUndefined();
    expect(redis.get).toHaveBeenCalledTimes(2);
  });

  it('throws daily exceeded when daily counter is at cap', async () => {
    const redis = makeGetRedis(500, 0);
    await expect(precheck({ redis, logger: silentLogger() }, CHECK)).rejects.toMatchObject({
      scope: 'daily',
    });
  });

  it('throws monthly exceeded when monthly counter is at cap', async () => {
    const redis = makeGetRedis(0, 5000);
    await expect(precheck({ redis, logger: silentLogger() }, CHECK)).rejects.toMatchObject({
      scope: 'monthly',
    });
  });

  it('fails closed when redis throws', async () => {
    const redis = {
      get: vi.fn().mockRejectedValue(new Error('boom')),
      incrBy: vi.fn(),
      expire: vi.fn(),
    };
    await expect(precheck({ redis, logger: silentLogger() }, CHECK)).rejects.toBeInstanceOf(
      SpendingCapUnavailable,
    );
  });
});
