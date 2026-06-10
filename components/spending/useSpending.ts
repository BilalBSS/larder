// / spending screen hook
import { type EffectCallback, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import type { DashboardData } from '@domain/use-cases/spending/get-dashboard';
import { spendingService, type SpendingService } from '@domain/use-cases/spending/service';
import {
  buildSpendingViewModel,
  defaultScope,
  type SpendScope,
  type SpendingViewModel,
} from '@domain/use-cases/spending/view-model';
import { currencyGlyph, useCurrency } from '@foundation/currency';

export interface UseSpendingArgs {
  readonly householdId: string | null;
  readonly userId: string;
}

export interface UseSpendingDeps {
  readonly service: Pick<SpendingService, 'dashboard'>;
  readonly useFocusEffect: (effect: EffectCallback) => void;
}

export interface UseSpendingResult {
  readonly vm: SpendingViewModel | null;
  readonly scope: SpendScope;
  readonly setScope: (scope: SpendScope) => void;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly reload: () => void;
}

const defaultDeps: UseSpendingDeps = {
  service: spendingService,
  useFocusEffect,
};

export function useSpending(
  args: UseSpendingArgs,
  deps: UseSpendingDeps = defaultDeps,
): UseSpendingResult {
  const { householdId, userId } = args;
  const { service, useFocusEffect: useFocus } = deps;
  const glyph = currencyGlyph(useCurrency());

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [scopeOverride, setScopeOverride] = useState<SpendScope | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (householdId === null) return;
    setLoading(true);
    try {
      const next = await service.dashboard(householdId, userId);
      if (mountedRef.current) {
        setData(next);
        setError(null);
      }
    } catch (caught) {
      if (mountedRef.current) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [householdId, userId, service]);

  useFocus(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const scope = scopeOverride ?? (data === null ? 'household' : defaultScope(data.householdType));
  const vm = useMemo(
    () => (data === null ? null : buildSpendingViewModel(data, scope, userId, glyph)),
    [data, scope, userId, glyph],
  );

  return { vm, scope, setScope: setScopeOverride, loading, error, reload: refetch };
}
