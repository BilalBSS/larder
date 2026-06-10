// / rate limit fail open
import type { ServerLogger } from './logger.ts';

export interface RedisLike {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

export interface RateLimitDeps {
  readonly redis: RedisLike;
  readonly logger: ServerLogger;
}

export interface RateLimitOptions {
  readonly key: string;
  readonly windowSeconds: number;
  readonly maxPerWindow: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterSeconds?: number;
}

export async function check(deps: RateLimitDeps, opts: RateLimitOptions): Promise<RateLimitResult> {
  try {
    const count = await deps.redis.incr(opts.key);
    if (count === 1) {
      await deps.redis.expire(opts.key, opts.windowSeconds);
    }
    if (count > opts.maxPerWindow) {
      return { allowed: false, retryAfterSeconds: opts.windowSeconds };
    }
    return { allowed: true };
  } catch (err) {
    deps.logger.error('ratelimit_redis_failure', err, { key: opts.key });
    return { allowed: true };
  }
}
