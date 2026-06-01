// / app context provider
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { startSessionRefresh, stopSessionRefresh } from './auth/session';
import { supabase } from './auth/supabase';
import { ENTITLEMENTS, type Entitlements, type Tier } from './billing/entitlements';
import { CurrencyProvider } from './currency';
import { makeClientLlmRouter, type ClientLlmRouter } from './llm/router';
import { makeLogger, type Logger } from './monitoring/logger';
import { initPosthog, type PosthogClient } from './monitoring/posthog';
import { captureException } from './monitoring/sentry';

export interface AuthUser {
  readonly id: string;
  readonly household_id: string | null;
  readonly tier: Tier;
  readonly currency: string;
}

export type AuthStatus = 'loading' | 'authed' | 'anon';

export type LoadAuthUser = (userId: string) => Promise<AuthUser>;

// / accept any pending invite
export type ResolvePendingInvite = (userId: string) => Promise<void>;

export interface AppContextValue {
  readonly supabase: SupabaseClient;
  readonly logger: Logger;
  readonly posthog: PosthogClient | null;
  readonly user: AuthUser | null;
  readonly authStatus: AuthStatus;
  readonly refreshUser: () => Promise<void>;
  readonly entitlements: Entitlements;
  readonly llmRouter: ClientLlmRouter;
}

const Ctx = createContext<AppContextValue | null>(null);

export interface AppContextProviderProps {
  readonly children: React.ReactNode;
  readonly loadAuthUser: LoadAuthUser;
  readonly resolvePendingInvite?: ResolvePendingInvite;
}

export function AppContextProvider({
  children,
  loadAuthUser,
  resolvePendingInvite,
}: AppContextProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const loadRef = useRef<LoadAuthUser>(loadAuthUser);
  const resolveInviteRef = useRef<ResolvePendingInvite | undefined>(resolvePendingInvite);
  const userIdRef = useRef<string | null>(null);

  const [posthog] = useState<PosthogClient | null>(() => initPosthog());
  const logger = useMemo<Logger>(() => makeLogger({ console, onError: captureException }), []);

  useEffect(() => {
    loadRef.current = loadAuthUser;
  }, [loadAuthUser]);

  useEffect(() => {
    resolveInviteRef.current = resolvePendingInvite;
  }, [resolvePendingInvite]);

  // / reload, keep on failure
  const refreshUser = useMemo<() => Promise<void>>(
    () => async () => {
      const userId = userIdRef.current;
      if (userId === null) return;
      try {
        const loaded = await loadRef.current(userId);
        if (userIdRef.current === userId) setUser(loaded);
      } catch (error: unknown) {
        logger.error('refresh_auth_user_failed', error);
      }
    },
    [logger],
  );

  useEffect(() => {
    let mounted = true;
    let loadedUserId: string | null = null;

    startSessionRefresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session === null || event === 'SIGNED_OUT') {
        loadedUserId = null;
        userIdRef.current = null;
        if (mounted) {
          setUser(null);
          setAuthStatus('anon');
        }
        return;
      }
      const userId = session.user.id;
      if (userId === loadedUserId) return;
      loadedUserId = userId;
      userIdRef.current = userId;
      loadRef.current(userId).then(
        (loaded) => {
          if (!mounted || loadedUserId !== userId) return;
          setUser(loaded);
          setAuthStatus('authed');
          void acceptPending(userId);
        },
        (error: unknown) => {
          if (loadedUserId === userId) {
            loadedUserId = null;
            userIdRef.current = null;
            if (mounted) {
              setUser(null);
              setAuthStatus('anon');
            }
          }
          logger.error('load_auth_user_failed', error);
        },
      );
    });

    // / resolve invite then refresh
    async function acceptPending(userId: string): Promise<void> {
      const resolve = resolveInviteRef.current;
      if (resolve === undefined) return;
      try {
        await resolve(userId);
      } catch (error: unknown) {
        logger.error('pending_invite_failed', error);
        return;
      }
      if (mounted && loadedUserId === userId) await refreshUser();
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      stopSessionRefresh();
    };
  }, [logger, refreshUser]);

  const tier: Tier = user?.tier ?? 'free';
  const entitlements = ENTITLEMENTS[tier];
  const llmRouter = useMemo<ClientLlmRouter>(
    () => makeClientLlmRouter({ supabase, entitlements }),
    [entitlements],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      supabase,
      logger,
      posthog,
      user,
      authStatus,
      refreshUser,
      entitlements,
      llmRouter,
    }),
    [logger, posthog, user, authStatus, refreshUser, entitlements, llmRouter],
  );

  return (
    <Ctx.Provider value={value}>
      <CurrencyProvider value={user?.currency ?? 'GBP'}>{children}</CurrencyProvider>
    </Ctx.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const value = useContext(Ctx);
  if (value === null) throw new Error('useAppContext used outside AppContextProvider');
  return value;
}

export function useUser(): AuthUser | null {
  return useAppContext().user;
}

export function useAuthStatus(): AuthStatus {
  return useAppContext().authStatus;
}

export function useRefreshUser(): () => Promise<void> {
  return useAppContext().refreshUser;
}

export function useEntitlements(): Entitlements {
  return useAppContext().entitlements;
}

export function useLogger(): Logger {
  return useAppContext().logger;
}
