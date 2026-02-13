/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#6D28D9';
const tintColorDark = '#A78BFA';

export const Colors = {
  light: {
    text: '#0B1220',
    mutedText: '#5B6475',
    background: '#F6F7FB',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E6E8F0',
    tint: tintColorLight,
    tintSoft: '#F3EEFF',
    icon: '#5B6475',
    tabIconDefault: '#7B8498',
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
