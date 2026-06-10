import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useEffect, type EffectCallback } from 'react';

import { useSpending, type UseSpendingDeps } from '@/components/spending/useSpending';
import type { DashboardData } from '@domain/use-cases/spending/get-dashboard';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

const NOW = new Date('2026-06-10T08:00:00.000Z');

function dashboard(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    window: [],
    currentMonthLines: [],
    recent: [],
    budgets: { household: null, personal: null },
    members: [{ userId: 'u-1', role: 'owner' }],
    householdType: 'roommates',
    now: NOW,
    ...overrides,
  };
}

function deps(service: { dashboard: jest.Mock }): UseSpendingDeps {
  return {
    service,
    useFocusEffect: (effect: EffectCallback) => {
      useEffect(effect, [effect]);
    },
  };
}

describe('useSpending', () => {
  it('loads on focus and defaults scope from household type', async () => {
    const service = { dashboard: jest.fn().mockResolvedValue(dashboard()) };
    const { result } = renderHook(() =>
      useSpending({ householdId: 'h-1', userId: 'u-1' }, deps(service)),
    );
    await waitFor(() => expect(result.current.vm).not.toBeNull());
    expect(service.dashboard).toHaveBeenCalledWith('h-1', 'u-1');
    expect(result.current.scope).toBe('mine');
    expect(result.current.error).toBeNull();
  });

  it('lets the toggle override the default scope', async () => {
    const service = { dashboard: jest.fn().mockResolvedValue(dashboard()) };
    const { result } = renderHook(() =>
      useSpending({ householdId: 'h-1', userId: 'u-1' }, deps(service)),
    );
    await waitFor(() => expect(result.current.vm).not.toBeNull());
    act(() => result.current.setScope('household'));
    expect(result.current.scope).toBe('household');
    expect(result.current.vm?.hero.eyebrow).toBe('Jun household total');
  });

  it('captures fetch errors and recovers on reload', async () => {
    const service = {
      dashboard: jest
        .fn()
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce(dashboard()),
    };
    const { result } = renderHook(() =>
      useSpending({ householdId: 'h-1', userId: 'u-1' }, deps(service)),
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.vm).toBeNull();
    await act(async () => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.vm).not.toBeNull());
    expect(result.current.error).toBeNull();
  });

  it('skips fetching without a household', () => {
    const service = { dashboard: jest.fn() };
    renderHook(() => useSpending({ householdId: null, userId: 'u-1' }, deps(service)));
    expect(service.dashboard).not.toHaveBeenCalled();
  });
});
