// / nav gate decision
import type { AuthStatus } from '@foundation/context';

export type Gate = 'loading' | 'auth' | 'onboarding' | 'tabs';

export function resolveGate(authStatus: AuthStatus, hasHousehold: boolean): Gate {
  if (authStatus === 'loading') return 'loading';
  if (authStatus === 'anon') return 'auth';
  return hasHousehold ? 'tabs' : 'onboarding';
}
