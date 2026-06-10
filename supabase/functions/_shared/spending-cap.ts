// / spending cap fail closed
import type { ServerLogger } from './logger.ts';

export interface SpendingRedis {
  get(key: string): Promise<number | null>;
  incrBy(key: string, value: number): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

export interface SpendingCapDeps {
  readonly redis: SpendingRedis;
  readonly logger: ServerLogger;
  readonly now?: () => Date;
}

export interface SpendingCapOptions {
  readonly user_id: string;
  readonly amount_usd_cents: number;
  readonly daily_cap_cents: number;
  readonly monthly_cap_cents: number;
}

export interface SpendingCapCheck {
  readonly user_id: string;
  readonly daily_cap_cents: number;
  readonly monthly_cap_cents: number;
}

export class SpendingCapExceeded extends Error {
  readonly scope: 'daily' | 'monthly';
  constructor(scope: 'daily' | 'monthly') {
    super(`spending_cap_exceeded:${scope}`);
    this.name = 'SpendingCapExceeded';
    this.scope = scope;
  }
}

export class SpendingCapUnavailable extends Error {
  constructor() {
    super('spending_cap_unavailable');
    this.name = 'SpendingCapUnavailable';
  }
}

const DAY_SECONDS = 86_400;
const MONTH_TTL_SECONDS = 86_400 * 35;

function spendKeys(user_id: string, now: Date): { dailyKey: string; monthlyKey: string } {
  const iso = now.toISOString();
  return {
    dailyKey: `spend:${user_id}:d:${iso.slice(0, 10)}`,
    monthlyKey: `spend:${user_id}:m:${iso.slice(0, 7)}`,
  };
}

export async function precheck(deps: SpendingCapDeps, opts: SpendingCapCheck): Promise<void> {
  const now = deps.now === undefined ? new Date() : deps.now();
  const { dailyKey, monthlyKey } = spendKeys(opts.user_id, now);

  let dailyTotal: number;
  let monthlyTotal: number;
  try {
    dailyTotal = (await deps.redis.get(dailyKey)) ?? 0;
    monthlyTotal = (await deps.redis.get(monthlyKey)) ?? 0;
  } catch (err) {
    deps.logger.error('spending_cap_redis_failure', err, { user_id: opts.user_id });
    throw new SpendingCapUnavailable();
  }

  if (dailyTotal >= opts.daily_cap_cents) throw new SpendingCapExceeded('daily');
  if (monthlyTotal >= opts.monthly_cap_cents) throw new SpendingCapExceeded('monthly');
}

export async function record(deps: SpendingCapDeps, opts: SpendingCapOptions): Promise<void> {
  const now = deps.now === undefined ? new Date() : deps.now();
  const { dailyKey, monthlyKey } = spendKeys(opts.user_id, now);

  let dailyTotal: number;
  let monthlyTotal: number;
  try {
    dailyTotal = await deps.redis.incrBy(dailyKey, opts.amount_usd_cents);
    if (dailyTotal === opts.amount_usd_cents) {
      await deps.redis.expire(dailyKey, DAY_SECONDS * 2);
    }
    monthlyTotal = await deps.redis.incrBy(monthlyKey, opts.amount_usd_cents);
    if (monthlyTotal === opts.amount_usd_cents) {
      await deps.redis.expire(monthlyKey, MONTH_TTL_SECONDS);
    }
  } catch (err) {
    deps.logger.error('spending_cap_redis_failure', err, { user_id: opts.user_id });
    throw new SpendingCapUnavailable();
  }

  if (dailyTotal > opts.daily_cap_cents) throw new SpendingCapExceeded('daily');
  if (monthlyTotal > opts.monthly_cap_cents) throw new SpendingCapExceeded('monthly');
}
