/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const editorialGold = '#D4AF37';

export const Colors = {
  light: {
    text: '#1A1A1A',
    mutedText: '#6C6863',
    background: '#F9F8F6',
    surface: '#F9F8F6',
    card: '#F9F8F6',
    border: 'rgba(26, 26, 26, 0.16)',
    tint: editorialGold,
    tintSoft: '#EBE5DE',
    icon: '#6C6863',
    tabIconDefault: '#6C6863',
    tabIconSelected: '#1A1A1A',
    tabBarBackground: '#F9F8F6',
  },
  dark: {
    text: '#F9F8F6',
    mutedText: 'rgba(235, 229, 222, 0.74)',
    background: '#1A1A1A',
    surface: '#1A1A1A',
    card: '#1A1A1A',
    border: 'rgba(249, 248, 246, 0.16)',
    tint: editorialGold,
    tintSoft: 'rgba(212, 175, 55, 0.2)',
    icon: 'rgba(235, 229, 222, 0.74)',
    tabIconDefault: 'rgba(235, 229, 222, 0.74)',
    tabIconSelected: '#F9F8F6',
    tabBarBackground: '#1A1A1A',
  },
};

export const Typography = {
  hero: {
    fontSize: 52,
    lineHeight: 52,
    letterSpacing: -1,
  },
  title: {
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 23,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
  },
  label: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2.6,
  },
  micro: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
  },
};

export const Radius = {
  none: 0,
};

export const Motion = {
  medium: 500,
  slow: 700,
  cinematic: 1600,
};

export const Shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
};

export function withAlpha(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '').trim();
  const normalized =
    hex.length === 3 ? hex.split('').map((c) => `${c}${c}`).join('') : hex.padEnd(6, '0').slice(0, 6);
  const intValue = Number.parseInt(normalized, 16);
  const r = (intValue >> 16) & 255;
  const g = (intValue >> 8) & 255;
  const b = intValue & 255;
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${clampedAlpha})`;
}

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter_400Regular',
    sansMedium: 'Inter_500Medium',
    serif: 'PlayfairDisplay_400Regular',
    serifItalic: 'PlayfairDisplay_400Regular_Italic',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'Inter_500Medium',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Inter_400Regular',
    sansMedium: 'Inter_500Medium',
    serif: 'PlayfairDisplay_400Regular',
    serifItalic: 'PlayfairDisplay_400Regular_Italic',
    rounded: 'Inter_500Medium',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    sansMedium: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
    serifItalic: "'Playfair Display', Georgia, 'Times New Roman', serif",
    rounded: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
