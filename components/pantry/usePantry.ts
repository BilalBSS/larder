// / pantry screen hook
import { type EffectCallback, useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import type { PantryItem } from '@domain/entities/pantry-item';
import { pantryService, type PantryService } from '@domain/use-cases/pantry/service';

export interface UsePantryArgs {
  readonly householdId: string | null;
  readonly userId: string;
}

export interface UsePantryDeps {
  readonly service: PantryService;
  readonly useFocusEffect: (effect: EffectCallback) => void;
}

export interface UsePantryResult {
  readonly items: PantryItem[];
  readonly loading: boolean;
  readonly error: Error | null;
  readonly loadedAt: Date;
  readonly remove: (item: PantryItem) => Promise<void>;
  readonly reload: () => void;
}

const defaultDeps: UsePantryDeps = {
  service: pantryService,
  useFocusEffect,
};

export function usePantry(args: UsePantryArgs, deps: UsePantryDeps = defaultDeps): UsePantryResult {
  const { householdId, userId } = args;
  const { service, useFocusEffect: useFocus } = deps;

  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date>(() => new Date());

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
      const next = await service.list(householdId);
      if (mountedRef.current) {
        setItems(next);
        setLoadedAt(new Date());
        setError(null);
      }
    } catch (caught) {
      if (mountedRef.current) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [householdId, service]);

  useFocus(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const runMutation = useCallback(
    async (action: () => Promise<void>) => {
      try {
        await action();
        await refetch();
      } catch (caught) {
        if (mountedRef.current) {
          setError(caught instanceof Error ? caught : new Error(String(caught)));
        }
      }
    },
    [refetch],
  );

  const remove = useCallback(
    (item: PantryItem): Promise<void> => {
      if (householdId === null) return Promise.resolve();
      return runMutation(() => service.remove({ id: item.id, householdId, userId }));
    },
    [householdId, userId, service, runMutation],
  );

  return { items, loading, error, loadedAt, remove, reload: refetch };
}
