import type React from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

export interface ScreenProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly edges?: readonly Edge[];
}

const DEFAULT_EDGES: readonly Edge[] = ['top', 'bottom'];

export function Screen({ children, className, edges = DEFAULT_EDGES }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 bg-paper ${className ?? ''}`}>
      {children}
    </SafeAreaView>
  );
}
