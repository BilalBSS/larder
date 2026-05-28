// / shopping list screen hook
import { type EffectCallback, useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ShoppingListItem } from '@domain/entities/shopping-list-item';
import type { GroupedShoppingList } from '@domain/use-cases/shopping-list/list';
import {
  shoppingListService,
  type ShoppingListService,
} from '@domain/use-cases/shopping-list/service';
import { supabase } from '@foundation/auth/supabase';
import { subscribeToTable } from '@foundation/realtime';

const REFRESH_DEBOUNCE_MS = 250;

export interface UseShoppingListArgs {
  readonly householdId: string | null;
  readonly userId: string;
}

export interface UseShoppingListDeps {
  readonly service: ShoppingListService;
  readonly subscribeToTable: typeof subscribeToTable;
  readonly supabase: Pick<SupabaseClient, 'channel' | 'removeChannel'>;
  readonly useFocusEffect: (effect: EffectCallback) => void;
}

export interface UseShoppingListResult {
  readonly toBuy: ShoppingListItem[];
  readonly gotIt: ShoppingListItem[];
  readonly loading: boolean;
  readonly error: Error | null;
  readonly add: (name: string) => Promise<void>;
  readonly toggle: (item: ShoppingListItem) => Promise<void>;
  readonly remove: (item: ShoppingListItem) => Promise<void>;
  readonly reload: () => void;
}

const defaultDeps: UseShoppingListDeps = {
  service: shoppingListService,
  subscribeToTable,
  supabase,
  useFocusEffect,
};

export function useShoppingList(
  args: UseShoppingListArgs,
  deps: UseShoppingListDeps = defaultDeps,
): UseShoppingListResult {
  const { householdId, userId } = args;
  const {
    service,
    subscribeToTable: subscribe,
    supabase: realtime,
    useFocusEffect: useFocus,
  } = deps;

  const [groups, setGroups] = useState<GroupedShoppingList>({ toBuy: [], gotIt: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setGroups(next);
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
      if (householdId === null) return;
      const unsubscribe = subscribe({
        supabase: realtime,
        table: 'shopping_list_items',
        filter: `household_id=eq.${householdId}`,
        onChange: () => {
          if (debounceRef.current !== null) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            void refetch();
          }, REFRESH_DEBOUNCE_MS);
        },
      });
      return () => {
        if (debounceRef.current !== null) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        unsubscribe();
      };
    }, [householdId, refetch, subscribe, realtime]),
  );

  const add = useCallback(
    async (name: string) => {
      if (householdId === null) return;
      await service.add({ householdId, displayName: name, addedByUserId: userId });
      await refetch();
    },
    [householdId, userId, service, refetch],
  );

  const toggle = useCallback(
    async (item: ShoppingListItem) => {
      if (householdId === null) return;
      await service.checkOff({ id: item.id, householdId, userId, checked: !item.isCheckedOff });
      await refetch();
    },
    [householdId, userId, service, refetch],
  );

  const remove = useCallback(
    async (item: ShoppingListItem) => {
      if (householdId === null) return;
      await service.remove({ id: item.id, householdId });
      await refetch();
    },
    [householdId, service, refetch],
  );

  return {
    toBuy: groups.toBuy,
    gotIt: groups.gotIt,
    loading,
    error,
    add,
    toggle,
    remove,
    reload: refetch,
  };
}
