import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { inviteService } from '@domain/use-cases/invite/service';
import { useAuthStatus, useLogger, useRefreshUser } from '@foundation/context';
import { Button, Logo, Screen, Text } from '@ui/index';

import { inviteMessage } from '../invite-copy';
import { setPendingInvite } from '../pending-invite';

// / fresh green token
const FRESH = '#4F7C45';

type Phase = 'working' | 'error';

export default function JoinInvite() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const authStatus = useAuthStatus();
  const refreshUser = useRefreshUser();
  const logger = useLogger();

  const [phase, setPhase] = useState<Phase>('working');
  const [message, setMessage] = useState('Joining the household…');

  useEffect(() => {
    if (authStatus === 'loading') return;
    let active = true;

    async function run() {
      if (token === '') {
        if (active) {
          setPhase('error');
          setMessage('That invite link is missing its code.');
        }
        return;
      }
      if (authStatus === 'anon') {
        try {
          await setPendingInvite(token);
        } catch (error: unknown) {
          logger.error('persist_pending_invite_failed', error);
        }
        router.replace('/sign-in');
        return;
      }
      try {
        await inviteService.accept(token);
        await refreshUser();
      } catch (error: unknown) {
        logger.error('accept_invite_failed', error);
        if (active) {
          setPhase('error');
          setMessage(inviteMessage(error));
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [authStatus, token, refreshUser, logger]);

  return (
    <Screen>
      <View className="flex-1 justify-center px-6">
        <Logo size={40} />
        <Text variant="display-lg" className="mt-6">
          {phase === 'error' ? 'Invite problem' : 'Joining'}
        </Text>
        <Text variant="body" tone="mid" className="mt-2">
          {message}
        </Text>
        {phase === 'working' ? (
          <ActivityIndicator testID="join-working" color={FRESH} className="mt-6 self-start" />
        ) : null}
        {phase === 'error' ? (
          <View className="mt-6">
            <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} full />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
