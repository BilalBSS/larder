import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { makeLoadAuthUser } from '@domain/use-cases/auth/load-current-user';
import { supabase } from '@foundation/auth/supabase';
import { AppContextProvider } from '@foundation/context';
import { initSentry } from '@foundation/monitoring/sentry';

initSentry();

const loadAuthUser = makeLoadAuthUser(supabase);

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppContextProvider loadAuthUser={loadAuthUser}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppContextProvider>
  );
}
