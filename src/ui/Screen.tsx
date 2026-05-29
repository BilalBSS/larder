import type React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function Screen({ children, className }: ScreenProps) {
  return <SafeAreaView className={`flex-1 bg-paper ${className ?? ''}`}>{children}</SafeAreaView>;
}
