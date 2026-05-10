import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '@foundation/auth/supabase';

let subscription: { remove: () => void } | null = null;

export function startSessionRefresh(): void {
  if (subscription !== null) {
    return;
  }
  subscription = AppState.addEventListener('change', handleAppStateChange);
  if (AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  }
}

export function stopSessionRefresh(): void {
  if (subscription === null) {
    return;
  }
  subscription.remove();
  subscription = null;
  supabase.auth.stopAutoRefresh();
}

function handleAppStateChange(state: AppStateStatus): void {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
}
