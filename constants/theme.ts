/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#2563EB';
const tintColorDark = '#60A5FA';

export const Colors = {
  light: {
    text: '#0F172A',
    mutedText: '#64748B',
    background: '#F2F4F8',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E5E7EB',
    tint: tintColorLight,
    tintSoft: '#EAF2FF',
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    tabBarBackground: '#FFFFFF',
  },
  dark: {
    text: '#E5E7EB',
    mutedText: '#9CA3AF',
    background: '#0B0E14',
    surface: '#0F172A',
    card: '#111827',
    border: '#1F2937',
    tint: tintColorDark,
    tintSoft: '#241338',
    icon: '#9CA3AF',
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorDark,
    tabBarBackground: '#0F172A',
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
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
