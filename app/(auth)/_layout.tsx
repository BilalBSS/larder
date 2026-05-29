import { Stack } from 'expo-router';

import { useAuthStatus } from '@foundation/context';

export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function AuthLayout() {
  const authStatus = useAuthStatus();
  const authed = authStatus === 'authed';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={authed}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!authed}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
    </Stack>
  );
}
