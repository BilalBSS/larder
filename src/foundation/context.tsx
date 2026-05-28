// / app context provider
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { startSessionRefresh, stopSessionRefresh } from './auth/session';
import { supabase } from './auth/supabase';
import { ENTITLEMENTS, type Entitlements, type Tier } from './billing/entitlements';
import { makeClientLlmRouter, type ClientLlmRouter } from './llm/router';
import { makeLogger, type Logger } from './monitoring/logger';
import { initPosthog, type PosthogClient } from './monitoring/posthog';
import { captureException } from './monitoring/sentry';

export interface AuthUser {
  readonly id: string;
  readonly household_id: string | null;
  readonly tier: Tier;
}

export type LoadAuthUser = (userId: string) => Promise<AuthUser>;

export interface AppContextValue {
  readonly supabase: SupabaseClient;
  readonly logger: Logger;
  readonly posthog: PosthogClient | null;
  readonly user: AuthUser | null;
  readonly entitlements: Entitlements;
  readonly llmRouter: ClientLlmRouter;
}

const Ctx = createContext<AppContextValue | null>(null);

export interface AppContextProviderProps {
  readonly children: React.ReactNode;
  readonly loadAuthUser: LoadAuthUser;
}

export function AppContextProvider({ children, loadAuthUser }: AppContextProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const loadRef = useRef<LoadAuthUser>(loadAuthUser);

  const [posthog] = useState<PosthogClient | null>(() => initPosthog());
  const logger = useMemo<Logger>(() => makeLogger({ console, onError: captureException }), []);

  useEffect(() => {
    loadRef.current = loadAuthUser;
  }, [loadAuthUser]);

  useEffect(() => {
    let mounted = true;
    let loadedUserId: string | null = null;

    startSessionRefresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session === null || event === 'SIGNED_OUT') {
        loadedUserId = null;
        if (mounted) setUser(null);
        return;
      }
      const userId = session.user.id;
      if (userId === loadedUserId) return;
      loadedUserId = userId;
      loadRef.current(userId).then(
        (loaded) => {
          if (mounted) setUser(loaded);
        },
        (error: unknown) => {
          loadedUserId = null;
          if (mounted) setUser(null);
          logger.error('load_auth_user_failed', error);
        },
      );
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      stopSessionRefresh();
    };
  }, [logger]);

  const tier: Tier = user?.tier ?? 'free';
  const entitlements = ENTITLEMENTS[tier];
  const llmRouter = useMemo<ClientLlmRouter>(
    () => makeClientLlmRouter({ supabase, entitlements }),
    [entitlements],
  );

  const value = useMemo<AppContextValue>(
    () => ({ supabase, logger, posthog, user, entitlements, llmRouter }),
    [logger, posthog, user, entitlements, llmRouter],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppContext(): AppContextValue {
  const value = useContext(Ctx);
  if (value === null) throw new Error('useAppContext used outside AppContextProvider');
  return value;
}

export function useUser(): AuthUser | null {
  return useAppContext().user;
}

export function useEntitlements(): Entitlements {
  return useAppContext().entitlements;
}

export function useLogger(): Logger {
  return useAppContext().logger;
}
