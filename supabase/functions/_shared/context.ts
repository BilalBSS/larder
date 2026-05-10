// / request context constructor
import type { AuthUser } from './types';
import { extractUser } from './auth';
import type { ServerLogger } from './logger';

export interface RequestContext {
  readonly user: AuthUser;
  readonly logger: ServerLogger;
  readonly idempotencyKey: string | null;
}

export interface RequestContextDeps {
  readonly headers: Headers;
  readonly baseLogger: ServerLogger;
}

export function makeRequestContext(deps: RequestContextDeps): RequestContext {
  const user = extractUser(deps.headers.get('authorization'));
  return {
    user,
    logger: deps.baseLogger.child({ user_id: user.id }),
    idempotencyKey: deps.headers.get('idempotency-key'),
  };
}
