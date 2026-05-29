import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { supabase } from '@foundation/auth/supabase';
import {
  AppContextProvider,
  useAuthStatus,
  useRefreshUser,
  useUser,
  type AuthUser,
} from '@foundation/context';

jest.mock('@foundation/auth/supabase', () => {
  const unsubscribe = jest.fn();
  return {
    supabase: {
      auth: {
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe } } })),
        startAutoRefresh: jest.fn(),
        stopAutoRefresh: jest.fn(),
      },
    },
  };
});

jest.mock('@foundation/auth/session', () => ({
  startSessionRefresh: jest.fn(),
  stopSessionRefresh: jest.fn(),
}));

jest.mock('@foundation/monitoring/sentry', () => ({
  captureException: jest.fn(),
  initSentry: jest.fn(),
}));

jest.mock('@foundation/monitoring/posthog', () => ({ initPosthog: () => null }));

const onAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

let refreshHandle: () => Promise<void>;

function Probe() {
  const user = useUser();
  const status = useAuthStatus();
  refreshHandle = useRefreshUser();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="household">{user?.household_id ?? 'none'}</Text>
    </>
  );
}

function userWith(household_id: string | null) {
  return async (id: string): Promise<AuthUser> => ({ id, household_id, tier: 'free' });
}

async function emit(event: string, value: unknown) {
  const callback = onAuthStateChange.mock.calls[0]?.[0] as (e: string, s: unknown) => void;
  await act(async () => {
    callback(event, value);
  });
}

function sessionFor(id: string) {
  return { user: { id } };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AppContextProvider authStatus', () => {
  it('starts loading, resolves to authed on a session', async () => {
    render(
      <AppContextProvider loadAuthUser={jest.fn(userWith('h-1'))}>
        <Probe />
      </AppContextProvider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await emit('INITIAL_SESSION', sessionFor('u-1'));
    expect(screen.getByTestId('status')).toHaveTextContent('authed');
  });

  it('moves to anon on sign out', async () => {
    render(
      <AppContextProvider loadAuthUser={jest.fn(userWith('h-1'))}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('INITIAL_SESSION', sessionFor('u-1'));
    await emit('SIGNED_OUT', null);
    expect(screen.getByTestId('status')).toHaveTextContent('anon');
  });

  it('resolves to anon when the initial load fails', async () => {
    const failing = jest.fn(async (): Promise<AuthUser> => {
      throw new Error('load failed');
    });
    render(
      <AppContextProvider loadAuthUser={failing}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('INITIAL_SESSION', sessionFor('u-1'));
    expect(screen.getByTestId('status')).toHaveTextContent('anon');
  });
});

describe('refreshUser', () => {
  it('flips household_id from null to a uuid', async () => {
    let household_id: string | null = null;
    const loadAuthUser = jest.fn(
      async (id: string): Promise<AuthUser> => ({ id, household_id, tier: 'free' }),
    );
    render(
      <AppContextProvider loadAuthUser={loadAuthUser}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('SIGNED_IN', sessionFor('u-1'));
    expect(screen.getByTestId('household')).toHaveTextContent('none');
    household_id = 'h-9';
    await act(async () => {
      await refreshHandle();
    });
    expect(screen.getByTestId('household')).toHaveTextContent('h-9');
  });

  it('keeps the prior user when refresh fails', async () => {
    let shouldFail = false;
    const loadAuthUser = jest.fn(async (id: string): Promise<AuthUser> => {
      if (shouldFail) throw new Error('refresh failed');
      return { id, household_id: 'h-1', tier: 'free' };
    });
    render(
      <AppContextProvider loadAuthUser={loadAuthUser}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('SIGNED_IN', sessionFor('u-1'));
    expect(screen.getByTestId('household')).toHaveTextContent('h-1');
    shouldFail = true;
    await act(async () => {
      await refreshHandle();
    });
    expect(screen.getByTestId('status')).toHaveTextContent('authed');
    expect(screen.getByTestId('household')).toHaveTextContent('h-1');
  });
});

describe('pending invite resolution', () => {
  it('resolves the invite on sign-in then refreshes', async () => {
    const order: string[] = [];
    let household_id: string | null = null;
    const loadAuthUser = jest.fn(async (id: string): Promise<AuthUser> => {
      order.push('load');
      return { id, household_id, tier: 'free' };
    });
    const resolvePendingInvite = jest.fn(async () => {
      order.push('resolve');
      household_id = 'h-joined';
    });
    render(
      <AppContextProvider loadAuthUser={loadAuthUser} resolvePendingInvite={resolvePendingInvite}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('SIGNED_IN', sessionFor('u-1'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(resolvePendingInvite).toHaveBeenCalledWith('u-1');
    expect(screen.getByTestId('household')).toHaveTextContent('h-joined');
    expect(order).toEqual(['load', 'resolve', 'load']);
  });

  it('keeps the session when invite resolution throws', async () => {
    const loadAuthUser = jest.fn(
      async (id: string): Promise<AuthUser> => ({ id, household_id: null, tier: 'free' }),
    );
    const resolvePendingInvite = jest.fn(async () => {
      throw new Error('bad token');
    });
    render(
      <AppContextProvider loadAuthUser={loadAuthUser} resolvePendingInvite={resolvePendingInvite}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('SIGNED_IN', sessionFor('u-1'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('status')).toHaveTextContent('authed');
  });
});
