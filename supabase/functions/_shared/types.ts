// / shared types

export interface AttestationToken {
  readonly platform: 'ios' | 'android' | 'web';
  readonly token: string;
  readonly issued_at: number;
}

export interface AuthUser {
  readonly id: string;
}
