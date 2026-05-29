import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { inviteService } from '@domain/use-cases/invite/service';
import { useLogger, useRefreshUser } from '@foundation/context';
import { Button, Logo, Screen, Text, TextField } from '@ui/index';

import { inviteMessage } from '@/src/shell/invite-copy';

// / rfc-4122 token shape
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type HouseholdType = 'family' | 'couple' | 'roommates' | 'shared';

const TYPES: readonly { value: HouseholdType; label: string }[] = [
  { value: 'family', label: 'Family' },
  { value: 'couple', label: 'Couple' },
  { value: 'roommates', label: 'Roommates' },
  { value: 'shared', label: 'Shared' },
];

export default function Onboarding() {
  const refreshUser = useRefreshUser();
  const logger = useLogger();
  const [mode, setMode] = useState<'create' | 'join'>('create');

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-16 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          <Logo size={40} />
          {mode === 'create' ? (
            <CreateHousehold
              logger={logger}
              refreshUser={refreshUser}
              onJoin={() => setMode('join')}
            />
          ) : (
            <JoinWithToken
              logger={logger}
              refreshUser={refreshUser}
              onCreate={() => setMode('create')}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

interface PaneProps {
  readonly logger: ReturnType<typeof useLogger>;
  readonly refreshUser: () => Promise<void>;
}

function CreateHousehold({
  logger,
  refreshUser,
  onJoin,
}: PaneProps & { readonly onJoin: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<HouseholdType>('family');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (name.trim() === '') {
      setError('Give your household a name.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await inviteService.createHousehold({ name: name.trim(), type });
      await refreshUser();
    } catch (err: unknown) {
      logger.error('create_household_failed', err);
      setError('Could not create your household. Try again.');
      setBusy(false);
    }
  }

  return (
    <View>
      <Text variant="display-lg" className="mt-6">
        Set up your household
      </Text>
      <Text variant="body" tone="mid" className="mt-1">
        Name it and pick who shares it.
      </Text>

      <View className="mt-8 gap-3">
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Household name"
          accessibilityLabel="household name"
        />
        <View className="flex-row flex-wrap gap-2">
          {TYPES.map((option) => {
            const selected = option.value === type;
            return (
              <Pressable
                key={option.value}
                onPress={() => setType(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                className={`rounded-pill border px-4 py-2 ${
                  selected ? 'border-ink bg-ink' : 'border-edge bg-surface'
                }`}
              >
                <Text variant="label" tone={selected ? 'inverse' : 'ink'}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error !== null ? (
        <Text variant="meta" tone="urgent" className="mt-3" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View className="mt-6">
        <Button
          label={busy ? 'Creating…' : 'Create household'}
          onPress={() => void submit()}
          disabled={busy}
          full
          size="lg"
        />
      </View>

      <View className="mt-6 flex-row justify-center gap-1">
        <Text variant="meta" tone="mid">
          Been invited?
        </Text>
        <Pressable
          onPress={onJoin}
          accessibilityRole="button"
          accessibilityLabel="I have an invite"
        >
          <Text variant="meta" tone="terracotta">
            I have an invite
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function JoinWithToken({
  logger,
  refreshUser,
  onCreate,
}: PaneProps & { readonly onCreate: () => void }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (token.trim() === '') {
      setError('Paste your invite link or code.');
      return;
    }
    const parsed = extractToken(token);
    if (parsed === null) {
      setError("That doesn't look like an invite link.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await inviteService.accept(parsed);
      await refreshUser();
    } catch (err: unknown) {
      logger.error('accept_invite_failed', err);
      setError(inviteMessage(err));
      setBusy(false);
    }
  }

  return (
    <View>
      <Text variant="display-lg" className="mt-6">
        Join a household
      </Text>
      <Text variant="body" tone="mid" className="mt-1">
        Paste the invite link someone shared with you.
      </Text>

      <View className="mt-8 gap-3">
        <TextField
          value={token}
          onChangeText={setToken}
          placeholder="larder://join/…"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="invite link"
        />
      </View>

      {error !== null ? (
        <Text variant="meta" tone="urgent" className="mt-3" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View className="mt-6">
        <Button
          label={busy ? 'Joining…' : 'Join household'}
          onPress={() => void submit()}
          disabled={busy}
          full
          size="lg"
        />
      </View>

      <View className="mt-6 flex-row justify-center gap-1">
        <Text variant="meta" tone="mid">
          Starting fresh?
        </Text>
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="Create a household"
        >
          <Text variant="meta" tone="terracotta">
            Create a household
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// / token from link
function extractToken(input: string): string | null {
  const trimmed = input.trim();
  const marker = 'join/';
  const index = trimmed.lastIndexOf(marker);
  const candidate = index === -1 ? trimmed : trimmed.slice(index + marker.length);
  return TOKEN_RE.test(candidate) ? candidate : null;
}
