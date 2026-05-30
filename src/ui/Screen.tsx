import type React from 'react';
import { View } from 'react-native';
import { type Edge, useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ScreenProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly edges?: readonly Edge[];
}

const DEFAULT_EDGES: readonly Edge[] = ['top', 'bottom'];

export function Screen({ children, className, edges = DEFAULT_EDGES }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-paper ${className ?? ''}`}
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: edges.includes('left') ? insets.left : 0,
        paddingRight: edges.includes('right') ? insets.right : 0,
      }}
    >
      {children}
    </View>
  );
}
