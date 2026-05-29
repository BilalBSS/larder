import { Text, type TextTone } from './Text';

export interface EyebrowProps {
  readonly children: string;
  readonly tone?: TextTone;
  readonly className?: string;
}

export function Eyebrow({ children, tone = 'mid', className = '' }: EyebrowProps) {
  return (
    <Text variant="eyebrow" tone={tone} className={className}>
      {children}
    </Text>
  );
}
