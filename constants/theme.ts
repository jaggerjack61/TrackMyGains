/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#6C63FF';
const tintColorDark = '#8B84FF';

export const Colors = {
  light: {
    text: '#3D4852',
    mutedText: '#6B7280',
    background: '#E0E5EC',
    surface: '#E0E5EC',
    card: '#E0E5EC',
    border: 'transparent',
    tint: tintColorLight,
    tintSoft: '#DAD8FF',
    icon: '#6B7280',
    tabIconDefault: '#8D96A4',
    tabIconSelected: tintColorLight,
    tabBarBackground: '#E0E5EC',
  },
  dark: {
    text: '#E8EEF7',
    mutedText: '#A4B0C0',
    background: '#1A2230',
    surface: '#1A2230',
    card: '#1A2230',
    border: 'transparent',
    tint: tintColorDark,
    tintSoft: '#2B3550',
    icon: '#A4B0C0',
    tabIconDefault: '#7A8698',
    tabIconSelected: tintColorDark,
    tabBarBackground: '#1A2230',
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
  container: 32,
  control: 16,
  inner: 12,
  full: 999,
} as const;
