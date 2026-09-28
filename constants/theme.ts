/**
 * Design tokens for Track My Gains.
 *
 * - `Colors` holds the semantic palette for light and dark mode.
 * - `Accents` gives each tracking area its own identity colour (weight, lifts, diet, cycle).
 * - `Radii`, `Spacing` and `getElevation` keep surfaces consistent across screens.
 */

import { Platform, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#0E1320',
    mutedText: '#5E6778',
    subtleText: '#8A93A5',
    background: '#F2F4F8',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardMuted: '#EEF1F6',
    border: '#E3E7EF',
    borderStrong: '#CDD3DF',
    tint: '#5048E5',
    tintSoft: '#ECEBFC',
    onTint: '#FFFFFF',
    danger: '#E5484D',
    dangerSoft: '#FDECEC',
    success: '#12A150',
    successSoft: '#E4F6EB',
    icon: '#5E6778',
    tabIconDefault: '#8A93A5',
    tabIconSelected: '#5048E5',
    tabBarBackground: '#FFFFFF',
    overlay: 'rgba(9,12,20,0.48)',
    shadow: '#0E1320',
  },
  dark: {
    text: '#EEF1F7',
    mutedText: '#9AA3B5',
    subtleText: '#6B7487',
    background: '#0B0D13',
    surface: '#12151D',
    card: '#151923',
    cardMuted: '#1D2230',
    border: '#242A38',
    borderStrong: '#343B4D',
    tint: '#8C86FF',
    tintSoft: '#221F45',
    onTint: '#0B0A1F',
    danger: '#FF6B70',
    dangerSoft: '#3A1A1E',
    success: '#3DD68C',
    successSoft: '#12301F',
    icon: '#9AA3B5',
    tabIconDefault: '#6B7487',
    tabIconSelected: '#8C86FF',
    tabBarBackground: '#151923',
    overlay: 'rgba(0,0,0,0.62)',
    shadow: '#000000',
  },
};

export type ThemeName = keyof typeof Colors;
export type ThemeColors = (typeof Colors)['light'];

export const Accents = {
  light: {
    weight: '#0A84D6',
    lifts: '#EA580C',
    diet: '#16A34A',
    cycle: '#DB2777',
  },
  dark: {
    weight: '#4DB8FF',
    lifts: '#FF8A4C',
    diet: '#4ADE80',
    cycle: '#F472B6',
  },
} as const;

export type AccentName = keyof (typeof Accents)['light'];

export const Macros = {
  light: {
    protein: '#7C5CFA',
    carbs: '#E89B0C',
    fats: '#E0567B',
  },
  dark: {
    protein: '#A78BFA',
    carbs: '#FBBF24',
    fats: '#F47C9C',
  },
} as const;

const parseHex = (hexColor: string) => {
  const hex = hexColor.replace('#', '').trim();
  const normalized =
    hex.length === 3 ? hex.split('').map((c) => `${c}${c}`).join('') : hex.padEnd(6, '0').slice(0, 6);
  const intValue = Number.parseInt(normalized, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

export function withAlpha(hexColor: string, alpha: number) {
  const { r, g, b } = parseHex(hexColor);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${clampedAlpha})`;
}

/** Returns white or near-black, whichever reads better on the given background. */
export function readableTextOn(hexColor: string) {
  const { r, g, b } = parseHex(hexColor);
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithWhite >= 3 ? '#FFFFFF' : '#0B0D13';
}

export const Fonts = Platform.select({
  ios: {
    sans: 'DM Sans Regular',
    sansMedium: 'DM Sans Medium',
    sansBold: 'DM Sans Bold',
    display: 'Plus Jakarta Sans ExtraBold',
    displayBold: 'Plus Jakarta Sans Bold',
    displaySemiBold: 'Plus Jakarta Sans SemiBold',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'DM Sans Regular',
    sansMedium: 'DM Sans Medium',
    sansBold: 'DM Sans Bold',
    display: 'Plus Jakarta Sans ExtraBold',
    displayBold: 'Plus Jakarta Sans Bold',
    displaySemiBold: 'Plus Jakarta Sans SemiBold',
    mono: 'monospace',
  },
  web: {
    sans: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    sansMedium: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    sansBold: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    display: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
    displayBold: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
    displaySemiBold: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Radii = {
  sheet: 28,
  card: 20,
  control: 14,
  inner: 10,
  full: 999,
} as const;

export const Spacing = {
  screen: 16,
  card: 16,
  section: 24,
} as const;

/**
 * Soft, low-contrast shadows in light mode. Dark mode relies on borders and
 * surface contrast instead, since shadows disappear on dark backgrounds.
 */
export function getElevation(theme: ThemeName, level: 1 | 2 | 3, color?: string): ViewStyle {
  if (theme === 'dark' && !color) {
    return { elevation: level === 3 ? 6 : 0 };
  }

  const recipes = {
    1: { opacity: 0.05, radius: 8, offset: 2, elevation: 1 },
    2: { opacity: 0.08, radius: 16, offset: 6, elevation: 3 },
    3: { opacity: 0.18, radius: 20, offset: 10, elevation: 8 },
  } as const;
  const recipe = recipes[level];

  return {
    shadowColor: color ?? Colors[theme].shadow,
    shadowOpacity: color ? recipe.opacity * 2 : recipe.opacity,
    shadowRadius: recipe.radius,
    shadowOffset: { width: 0, height: recipe.offset },
    elevation: recipe.elevation,
  };
}
