import { Text } from 'react-native';

import type { UrgencyTone } from '@domain/entities/pantry-expiry';

export type { UrgencyTone };

export interface UrgencyTagProps {
  readonly tone: UrgencyTone;
  readonly children: string;
}

const toneClass: Record<UrgencyTone, string> = {
  urgent: 'bg-urgency-urgent-bg text-urgency-urgent-deep',
  soon: 'bg-urgency-soon-bg text-urgency-soon-deep',
  fresh: 'bg-urgency-fresh-bg text-urgency-fresh-deep',
  frozen: 'bg-urgency-frozen-bg text-urgency-frozen',
  gone: 'bg-transparent text-mid',
};

export function UrgencyTag({ tone, children }: UrgencyTagProps) {
  return (
    <Text
      className={`self-start overflow-hidden rounded-1 px-2 py-[2px] font-manrope-semibold text-eyebrow uppercase tracking-eyebrow ${toneClass[tone]}`}
    >
      {children}
    </Text>
  );
}
