import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { supabase } from '@foundation/auth/supabase';
import { Button, Logo, Screen, Text, TextField } from '@ui/index';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (email.trim() === '' || password === '') {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signInError !== null) {
      setError(signInMessage(signInError.message));
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center px-6">
        <Logo size={40} />
        <Text variant="display-lg" className="mt-6">
          Welcome back
        </Text>
        <Text variant="body" tone="mid" className="mt-1">
          Sign in to your household.
        </Text>

        <View className="mt-8 gap-3">
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            accessibilityLabel="email"
          />
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            accessibilityLabel="password"
            onSubmitEditing={() => void submit()}
          />
        </View>

        {error !== null ? (
          <Text variant="meta" tone="urgent" className="mt-3">
            {error}
          </Text>
        ) : null}

        <View className="mt-6">
          <Button
            label={busy ? 'Signing in…' : 'Sign in'}
            onPress={() => void submit()}
            disabled={busy}
            full
            size="lg"
          />
        </View>

        <View className="mt-6 flex-row justify-center gap-1">
          <Text variant="meta" tone="mid">
            New to Larder?
          </Text>
          <Link href="/sign-up">
            <Text variant="meta" tone="terracotta">
              Create an account
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

// / map sign-in error
function signInMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('credentials')) {
    return 'That email or password is incorrect.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Connection problem. Try again.';
  }
  if (lower.includes('not confirmed') || lower.includes('confirm')) {
    return 'Confirm your email first, then sign in.';
  }
  return 'Could not sign in. Try again.';
}
