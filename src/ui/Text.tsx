import { Text as RNText, type TextProps } from 'react-native';

export type TextVariant =
  | 'eyebrow'
  | 'meta'
  | 'body'
  | 'body-strong'
  | 'label'
  | 'num'
  | 'title'
  | 'display'
  | 'display-lg'
  | 'display-xl';

export type NumSize = 'sm' | 'md' | 'lg' | 'xl' | 'display';

export type TextTone =
  | 'ink'
  | 'ink-soft'
  | 'mid'
  | 'muted'
  | 'terracotta'
  | 'terracotta-deep'
  | 'inverse'
  | 'urgent'
  | 'soon'
  | 'fresh'
  | 'frozen';

export interface AppTextProps extends TextProps {
  readonly variant?: TextVariant;
  readonly tone?: TextTone;
  readonly numSize?: NumSize;
}

const variantClass: Record<TextVariant, string> = {
  eyebrow: 'font-manrope-semibold text-eyebrow uppercase tracking-eyebrow',
  meta: 'font-manrope-medium text-meta',
  body: 'font-manrope-medium text-body',
  'body-strong': 'font-manrope-bold text-body',
  label: 'font-manrope-semibold text-label',
  num: 'font-manrope-semibold text-num tracking-num',
  title: 'font-newsreader-medium text-title',
  display: 'font-newsreader-semibold text-display tracking-display',
  'display-lg': 'font-newsreader-semibold text-display-lg tracking-display',
  'display-xl': 'font-newsreader-semibold text-display-xl tracking-display',
};

const numSizeClass: Record<NumSize, string> = {
  sm: 'text-num-sm',
  md: 'text-num',
  lg: 'text-num-lg',
  xl: 'text-num-xl',
  display: 'text-num-display',
};

const defaultTone: Record<TextVariant, TextTone> = {
  eyebrow: 'mid',
  meta: 'mid',
  body: 'ink',
  'body-strong': 'ink',
  label: 'ink',
  num: 'ink',
  title: 'ink',
  display: 'ink',
  'display-lg': 'ink',
  'display-xl': 'ink',
};

const toneClass: Record<TextTone, string> = {
  ink: 'text-ink',
  'ink-soft': 'text-ink-soft',
  mid: 'text-mid',
  muted: 'text-muted',
  terracotta: 'text-terracotta',
  'terracotta-deep': 'text-terracotta-deep',
  inverse: 'text-surface-2',
  urgent: 'text-urgency-urgent-deep',
  soon: 'text-urgency-soon-deep',
  fresh: 'text-urgency-fresh-deep',
  frozen: 'text-urgency-frozen',
};

export function Text({
  variant = 'body',
  tone,
  numSize,
  className,
  children,
  ...rest
}: AppTextProps) {
  const resolvedTone = tone ?? defaultTone[variant];
  const sizeClass = variant === 'num' && numSize !== undefined ? numSizeClass[numSize] : '';
  return (
    <RNText
      className={`${variantClass[variant]} ${sizeClass} ${toneClass[resolvedTone]} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </RNText>
  );
}
