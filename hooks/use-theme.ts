import { Accents, Colors, Macros, type ThemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Current colour scheme plus its resolved palette, section accents and macro colours. */
export function useTheme() {
  const scheme: ThemeName = useColorScheme() === 'dark' ? 'dark' : 'light';

  return {
    scheme,
    colors: Colors[scheme],
    accents: Accents[scheme],
    macros: Macros[scheme],
  };
}
