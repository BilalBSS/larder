import type { LucideIcon } from 'lucide-react-native';

// / ink token default
const INK = '#1C1814';

export interface IconProps {
  readonly icon: LucideIcon;
  readonly accessibilityLabel: string;
  readonly size?: number;
  readonly color?: string;
}

export function Icon({ icon: LucideGlyph, accessibilityLabel, size = 24, color = INK }: IconProps) {
  return (
    <LucideGlyph
      size={size}
      color={color}
      strokeWidth={1.6}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
