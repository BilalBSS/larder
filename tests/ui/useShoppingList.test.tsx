import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type EffectCallback, useEffect } from 'react';

import { useShoppingList, type UseShoppingListDeps } from '@/components/shopping/useShoppingList';
import type { ShoppingListItem } from '@domain/entities/shopping-list-item';

function useImmediateFocus(effect: EffectCallback): void {
  useEffect(effect, [effect]);
}

function item(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id: 'i-1',
    householdId: 'h-1',
    canonicalName: 'milk',
    displayName: 'Milk',
    quantity: null,
    unit: null,
    category: null,
    addedByUserId: 'u-1',
    ownerUserId: null,
    isAutoAdded: false,
    isCheckedOff: false,
    checkedOffAt: null,
    checkedOffByUserId: null,
    version: 1,
    createdAt: '2026-05-28T00:00:00Z',
    ...overrides,
  };
}

function makeDeps() {
  let onChange: (() => void) | null = null;
  const unsubscribe = jest.fn();
  const service = {
    list: jest.fn(async () => ({
      toBuy: [item({ id: 'a' })],
      gotIt: [item({ id: 'b', isCheckedOff: true })],
    })),
    add: jest.fn(async () => undefined),
    checkOff: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
  };
  const subscribeToTable = jest.fn((opts: { onChange: () => void }) => {
    onChange = opts.onChange;
    return unsubscribe;
  });
  const deps: UseShoppingListDeps = {
    service,
    subscribeToTable: subscribeToTable as unknown as UseShoppingListDeps['subscribeToTable'],
    supabase: {} as unknown as UseShoppingListDeps['supabase'],
    useFocusEffect: useImmediateFocus,
  };
  return { deps, service, subscribeToTable, unsubscribe, emit: () => onChange?.() };
}

describe('useShoppingList', () => {
  it('loads and groups items on focus', async () => {
    const { deps, service } = makeDeps();
    const { result } = renderHook(() =>
      useShoppingList({ householdId: 'h-1', userId: 'u-1' }, deps),
    );
    await waitFor(() => expect(result.current.toBuy).toHaveLength(1));
    expect(service.list).toHaveBeenCalledWith('h-1');
    expect(result.current.gotIt).toHaveLength(1);
  });

  it('subscribes with the household filter and tears down on unmount', async () => {
    const { deps, subscribeToTable, unsubscribe } = makeDeps();
    const { unmount } = renderHook(() =>
      useShoppingList({ householdId: 'h-1', userId: 'u-1' }, deps),
    );
    await waitFor(() => expect(subscribeToTable).toHaveBeenCalledTimes(1));
    expect(subscribeToTable.mock.calls[0]?.[0]).toMatchObject({
      table: 'shopping_list_items',
      filter: 'household_id=eq.h-1',
    });
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe without a household', async () => {
    const { deps, service, subscribeToTable } = makeDeps();
    renderHook(() => useShoppingList({ householdId: null, userId: 'u-1' }, deps));
    await act(async () => undefined);
    expect(subscribeToTable).not.toHaveBeenCalled();
    expect(service.list).not.toHaveBeenCalled();
  });

  it('debounces a realtime refetch', async () => {
    jest.useFakeTimers();
    try {
      const { deps, service, emit } = makeDeps();
      renderHook(() => useShoppingList({ householdId: 'h-1', userId: 'u-1' }, deps));
      await act(async () => undefined);
      expect(service.list).toHaveBeenCalledTimes(1);
      act(() => emit());
      act(() => {
        jest.advanceTimersByTime(250);
      });
      await act(async () => undefined);
      expect(service.list).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('cancels a pending debounce on teardown', async () => {
    jest.useFakeTimers();
    try {
      const { deps, service, emit } = makeDeps();
      const { unmount } = renderHook(() =>
        useShoppingList({ householdId: 'h-1', userId: 'u-1' }, deps),
      );
      await act(async () => undefined);
      expect(service.list).toHaveBeenCalledTimes(1);
      act(() => emit());
      unmount();
      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(service.list).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('adds then refetches', async () => {
    const { deps, service } = makeDeps();
    const { result } = renderHook(() =>
      useShoppingList({ householdId: 'h-1', userId: 'u-1' }, deps),
    );
    await waitFor(() => expect(service.list).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.add('eggs');
    });
    expect(service.add).toHaveBeenCalledWith({
      householdId: 'h-1',
      displayName: 'eggs',
      addedByUserId: 'u-1',
    });
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('toggles checked state then refetches', async () => {
    const { deps, service } = makeDeps();
    const { result } = renderHook(() =>
      useShoppingList({ householdId: 'h-1', userId: 'u-1' }, deps),
    );
    await waitFor(() => expect(service.list).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.toggle(item({ id: 'x', isCheckedOff: false }));
    });
    expect(service.checkOff).toHaveBeenCalledWith({
      id: 'x',
      householdId: 'h-1',
      userId: 'u-1',
      checked: true,
    });
  });
});
