// / device attestation client
import { Platform } from 'react-native';

export interface AttestationToken {
  readonly platform: 'ios' | 'android' | 'web';
  readonly token: string;
  readonly issued_at: number;
}

export async function attest(challenge: string): Promise<AttestationToken> {
  return {
    platform: platformId(),
    token: `dev-stub:${challenge}`,
    issued_at: Date.now(),
  };
}

function platformId(): AttestationToken['platform'] {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}
