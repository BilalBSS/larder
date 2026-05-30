import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type EffectCallback, useEffect } from 'react';

import { usePantry, type UsePantryDeps } from '@/components/pantry/usePantry';
import type { PantryItem } from '@domain/entities/pantry-item';

function useImmediateFocus(effect: EffectCallback): void {
  useEffect(effect, [effect]);
}

function item(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: 'i-1',
    householdId: 'h-1',
    canonicalName: 'bananas',
    displayName: 'Bananas',
    category: 'produce',
    quantity: 6,
    unit: 'count',
    expirationDate: null,
    estimatedExpirationDays: null,
    lastPurchasedAt: null,
    lastUnitCost: null,
    notes: null,
    isFrozen: false,
    createdByUserId: 'u-1',
    updatedByUserId: 'u-1',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDeps() {
  const service = {
    list: jest.fn(async () => [item({ id: 'a' })]),
    add: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
    lookup: jest.fn(async () => null),
  };
  const deps: UsePantryDeps = {
    service: service as unknown as UsePantryDeps['service'],
    useFocusEffect: useImmediateFocus,
  };
  return { deps, service };
}

describe('usePantry', () => {
  it('loads items on focus and stamps loadedAt', async () => {
    const { deps, service } = makeDeps();
    const { result } = renderHook(() => usePantry({ householdId: 'h-1', userId: 'u-1' }, deps));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(service.list).toHaveBeenCalledWith('h-1');
    expect(result.current.loadedAt).toBeInstanceOf(Date);
  });

  it('does nothing without a household', async () => {
    const { deps, service } = makeDeps();
    renderHook(() => usePantry({ householdId: null, userId: 'u-1' }, deps));
    await act(async () => undefined);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('removes then refetches', async () => {
    const { deps, service } = makeDeps();
    const { result } = renderHook(() => usePantry({ householdId: 'h-1', userId: 'u-1' }, deps));
    await waitFor(() => expect(service.list).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.remove(item({ id: 'x' }));
    });
    expect(service.remove).toHaveBeenCalledWith({ id: 'x', householdId: 'h-1', userId: 'u-1' });
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('surfaces a mutation failure as an error', async () => {
    const { deps, service } = makeDeps();
    (service.remove as jest.Mock).mockRejectedValueOnce(new Error('remove failed'));
    const { result } = renderHook(() => usePantry({ householdId: 'h-1', userId: 'u-1' }, deps));
    await waitFor(() => expect(service.list).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.remove(item());
    });
    expect(result.current.error).toEqual(new Error('remove failed'));
  });

  it('surfaces a load failure as an error', async () => {
    const { deps, service } = makeDeps();
    (service.list as jest.Mock).mockRejectedValueOnce(new Error('list failed'));
    const { result } = renderHook(() => usePantry({ householdId: 'h-1', userId: 'u-1' }, deps));
    await waitFor(() => expect(result.current.error).toEqual(new Error('list failed')));
  });

  it('ignores a resolution after unmount', async () => {
    let resolveList: (items: PantryItem[]) => void = () => undefined;
    const service = {
      list: jest.fn(
        () =>
          new Promise<PantryItem[]>((resolve) => {
            resolveList = resolve;
          }),
      ),
      add: jest.fn(async () => undefined),
      remove: jest.fn(async () => undefined),
      lookup: jest.fn(async () => null),
    };
    const deps: UsePantryDeps = {
      service: service as unknown as UsePantryDeps['service'],
      useFocusEffect: useImmediateFocus,
    };
    const { result, unmount } = renderHook(() =>
      usePantry({ householdId: 'h-1', userId: 'u-1' }, deps),
    );
    unmount();
    await act(async () => {
      resolveList([item()]);
    });
    expect(result.current.items).toHaveLength(0);
  });
});
