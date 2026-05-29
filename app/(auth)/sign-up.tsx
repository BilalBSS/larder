import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { supabase } from '@foundation/auth/supabase';
import { Button, Logo, Screen, Text, TextField } from '@ui/index';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function submit() {
    if (busy) return;
    if (email.trim() === '' || password === '') {
      setError('Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    setError(null);
    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signUpError !== null) {
      setError(signUpMessage(signUpError.message));
      return;
    }
    // / confirmation on, no session
    if (data.session === null) {
      setConfirmSent(true);
    }
  }

  if (confirmSent) {
    return (
      <Screen>
        <View className="flex-1 justify-center px-6">
          <Logo size={40} />
          <Text variant="display-lg" className="mt-6">
            Check your email
          </Text>
          <Text variant="body" tone="mid" className="mt-2">
            We sent a confirmation link to {email.trim()}. Open it to finish setting up your
            account.
          </Text>
          <View className="mt-8 flex-row justify-center gap-1">
            <Text variant="meta" tone="mid">
              Already confirmed?
            </Text>
            <Link href="/sign-in">
              <Text variant="meta" tone="terracotta">
                Sign in
              </Text>
            </Link>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 justify-center px-6">
        <Logo size={40} />
        <Text variant="display-lg" className="mt-6">
          Create your account
        </Text>
        <Text variant="body" tone="mid" className="mt-1">
          Start a household or join one with an invite.
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
            autoComplete="new-password"
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
            label={busy ? 'Creating…' : 'Create account'}
            onPress={() => void submit()}
            disabled={busy}
            full
            size="lg"
          />
        </View>

        <View className="mt-6 flex-row justify-center gap-1">
          <Text variant="meta" tone="mid">
            Already have an account?
          </Text>
          <Link href="/sign-in">
            <Text variant="meta" tone="terracotta">
              Sign in
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

// / map sign-up error
function signUpMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already') || lower.includes('registered')) {
    return 'That email is already registered. Try signing in.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Connection problem. Try again.';
  }
  if (lower.includes('password')) {
    return 'Use at least 6 characters.';
  }
  return 'Could not create your account. Try again.';
}
