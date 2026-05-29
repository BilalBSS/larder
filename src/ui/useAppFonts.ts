import { Newsreader_500Medium, Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';

export interface AppFontsState {
  readonly fontsLoaded: boolean;
}

// / load only scale weights
export function useAppFonts(): AppFontsState {
  const [loaded, error] = useFonts({
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  // / system fallback on error
  return { fontsLoaded: loaded || error !== null };
}
