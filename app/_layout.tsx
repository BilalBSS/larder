import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import '../global.css';

import { resolveGate } from '@/src/shell/resolve-gate';
import { resolvePendingInvite } from '@/src/shell/resolve-pending-invite';
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
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppContextProvider loadAuthUser={loadAuthUser} resolvePendingInvite={resolvePendingInvite}>
        <ThemeProvider value={DefaultTheme}>
          <RootNavigator fontsLoaded={fontsLoaded} />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AppContextProvider>
    </SafeAreaProvider>
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
      <Stack.Screen name="join/[token]" />
      <Stack.Screen name="add-item" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="item/[id]"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetCornerRadius: 20,
          sheetAllowedDetents: 'fitToContents',
          contentStyle: { backgroundColor: '#FFFCF4' },
        }}
      />
    </Stack>
  );
}
