import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { supabase } from '@foundation/auth/supabase';
import { AppContextProvider, useUser, type AuthUser } from '@foundation/context';

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

function Probe() {
  const user = useUser();
  return <Text testID="uid">{user?.id ?? 'none'}</Text>;
}

function loader() {
  return jest.fn(
    async (id: string): Promise<AuthUser> => ({
      id,
      household_id: 'h-1',
      tier: 'free',
      currency: 'GBP',
    }),
  );
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

describe('AppContextProvider auth lifecycle', () => {
  it('loads the user on the initial session', async () => {
    const loadAuthUser = loader();
    render(
      <AppContextProvider loadAuthUser={loadAuthUser}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('INITIAL_SESSION', sessionFor('u-1'));
    expect(loadAuthUser).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('uid')).toHaveTextContent('u-1');
  });

  it('dedupes repeat events for the same session', async () => {
    const loadAuthUser = loader();
    render(
      <AppContextProvider loadAuthUser={loadAuthUser}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('INITIAL_SESSION', sessionFor('u-1'));
    await emit('SIGNED_IN', sessionFor('u-1'));
    expect(loadAuthUser).toHaveBeenCalledTimes(1);
  });

  it('reloads for a different user', async () => {
    const loadAuthUser = loader();
    render(
      <AppContextProvider loadAuthUser={loadAuthUser}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('INITIAL_SESSION', sessionFor('u-1'));
    await emit('SIGNED_IN', sessionFor('u-2'));
    expect(loadAuthUser).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('uid')).toHaveTextContent('u-2');
  });

  it('clears the user on sign out', async () => {
    const loadAuthUser = loader();
    render(
      <AppContextProvider loadAuthUser={loadAuthUser}>
        <Probe />
      </AppContextProvider>,
    );
    await emit('INITIAL_SESSION', sessionFor('u-1'));
    await emit('SIGNED_OUT', null);
    expect(screen.getByTestId('uid')).toHaveTextContent('none');
  });

  it('unsubscribes on unmount', async () => {
    const loadAuthUser = loader();
    const view = render(
      <AppContextProvider loadAuthUser={loadAuthUser}>
        <Probe />
      </AppContextProvider>,
    );
    const subscription = onAuthStateChange.mock.results[0]?.value as {
      data: { subscription: { unsubscribe: jest.Mock } };
    };
    view.unmount();
    expect(subscription.data.subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale load that resolves after a newer session', async () => {
    const resolvers: Record<string, () => void> = {};
    const loadAuthUser = jest.fn(
      (id: string) =>
        new Promise<AuthUser>((resolve) => {
          resolvers[id] = () => resolve({ id, household_id: 'h-1', tier: 'free', currency: 'GBP' });
        }),
    );
    render(
      <AppContextProvider loadAuthUser={loadAuthUser}>
        <Probe />
      </AppContextProvider>,
    );
    const callback = onAuthStateChange.mock.calls[0]?.[0] as (e: string, s: unknown) => void;
    await act(async () => {
      callback('SIGNED_IN', sessionFor('u-1'));
      callback('SIGNED_IN', sessionFor('u-2'));
    });
    await act(async () => {
      resolvers['u-2']?.();
    });
    await act(async () => {
      resolvers['u-1']?.();
    });
    expect(screen.getByTestId('uid')).toHaveTextContent('u-2');
  });
});
