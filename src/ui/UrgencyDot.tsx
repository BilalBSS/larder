// / urgency status dot
import { View } from 'react-native';

import type { UrgencyTone } from '@domain/entities/pantry-expiry';

const toneClass: Record<UrgencyTone, string> = {
  urgent: 'bg-urgency-urgent',
  soon: 'bg-urgency-soon',
  fresh: 'bg-urgency-fresh',
  frozen: 'bg-urgency-frozen',
  gone: 'bg-urgency-gone',
};

export interface UrgencyDotProps {
  readonly tone: UrgencyTone;
  readonly size?: number;
}

export function UrgencyDot({ tone, size = 8 }: UrgencyDotProps) {
  return (
    <View className={`rounded-pill ${toneClass[tone]}`} style={{ width: size, height: size }} />
  );
}
