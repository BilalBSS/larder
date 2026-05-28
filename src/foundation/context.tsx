// / app context provider
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from './auth/supabase';
import { ENTITLEMENTS, type Entitlements, type Tier } from './billing/entitlements';
import { makeClientLlmRouter, type ClientLlmRouter } from './llm/router';
import { makeLogger, type Logger } from './monitoring/logger';
import { initPosthog, type PosthogClient } from './monitoring/posthog';
import { captureException } from './monitoring/sentry';

export interface AuthUser {
  readonly id: string;
  readonly household_id: string;
  readonly tier: Tier;
}

export interface AppContextValue {
  readonly supabase: SupabaseClient;
  readonly logger: Logger;
  readonly posthog: PosthogClient | null;
  readonly user: AuthUser | null;
  readonly entitlements: Entitlements;
  readonly llmRouter: ClientLlmRouter;
}

const Ctx = createContext<AppContextValue | null>(null);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const user: AuthUser | null = null;
  const tier: Tier = 'free';
  const entitlements = ENTITLEMENTS[tier];

  const [posthog] = useState<PosthogClient | null>(() => initPosthog());
  const logger = useMemo<Logger>(() => makeLogger({ console, onError: captureException }), []);
  const llmRouter = useMemo<ClientLlmRouter>(
    () => makeClientLlmRouter({ supabase, entitlements }),
    [entitlements],
  );

  const value = useMemo<AppContextValue>(
    () => ({ supabase, logger, posthog, user, entitlements, llmRouter }),
    [logger, posthog, entitlements, llmRouter],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppContext(): AppContextValue {
  const value = useContext(Ctx);
  if (value === null) throw new Error('useAppContext used outside AppContextProvider');
  return value;
}

export function useEntitlements(): Entitlements {
  return useAppContext().entitlements;
}

export function useLogger(): Logger {
  return useAppContext().logger;
}
