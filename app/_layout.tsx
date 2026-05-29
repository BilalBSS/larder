import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { resolvePendingInvite } from '@/app/(auth)/resolve-pending-invite';
import { resolveGate } from '@/app/resolve-gate';
import { makeLoadAuthUser } from '@domain/use-cases/auth/load-current-user';
import { supabase } from '@foundation/auth/supabase';
import { AppContextProvider, useAuthStatus, useUser } from '@foundation/context';
import { initSentry } from '@foundation/monitoring/sentry';
import { useAppFonts } from '@ui/useAppFonts';

initSentry();
void SplashScreen.preventAutoHideAsync();

const loadAuthUser = makeLoadAuthUser(supabase);

export default function RootLayout() {
  const { fontsLoaded } = useAppFonts();

  return (
    <AppContextProvider loadAuthUser={loadAuthUser} resolvePendingInvite={resolvePendingInvite}>
      <ThemeProvider value={DefaultTheme}>
        <RootNavigator fontsLoaded={fontsLoaded} />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppContextProvider>
  );
}

function RootNavigator({ fontsLoaded }: { readonly fontsLoaded: boolean }) {
  const authStatus = useAuthStatus();
  const user = useUser();
  const gate = resolveGate(authStatus, user?.household_id != null);
  const ready = fontsLoaded && gate !== 'loading';

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={gate === 'tabs'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={gate !== 'tabs'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
