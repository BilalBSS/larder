import { Text as RNText, type TextProps } from 'react-native';

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption';
type Tone = 'default' | 'muted' | 'terracotta' | 'inverse';

export interface AppTextProps extends TextProps {
  readonly variant?: Variant;
  readonly tone?: Tone;
}

const variantClass: Record<Variant, string> = {
  title: 'text-title',
  heading: 'text-heading',
  body: 'text-body',
  label: 'text-label',
  caption: 'text-caption',
};

const toneClass: Record<Tone, string> = {
  default: 'text-ink',
  muted: 'text-muted',
  terracotta: 'text-terracotta',
  inverse: 'text-white',
};

export function Text({
  variant = 'body',
  tone = 'default',
  className,
  children,
  ...rest
}: AppTextProps) {
  return (
    <RNText className={`${variantClass[variant]} ${toneClass[tone]} ${className ?? ''}`} {...rest}>
      {children}
    </RNText>
  );
}
