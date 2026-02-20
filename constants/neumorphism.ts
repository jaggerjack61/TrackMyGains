import type { ViewStyle } from 'react-native';

export type SoftDepth = 'extruded' | 'extrudedHover' | 'extrudedSmall' | 'pressed' | 'pressedDeep' | 'pressedSmall';
export type SoftTheme = 'light' | 'dark';

const shadowBase = {
  light: {
    light: 'rgba(255,255,255,0.58)',
    dark: 'rgba(163,177,198,0.68)',
  },
  dark: {
    light: 'rgba(72,85,106,0.52)',
    dark: 'rgba(9,14,23,0.7)',
  },
} as const;

const recipes: Record<SoftTheme, Record<SoftDepth, { darkOffset: number; lightOffset: number; radius: number; opacity: number; elevation: number }>> = {
  light: {
    extruded: { darkOffset: 9, lightOffset: -9, radius: 16, opacity: 1, elevation: 7 },
    extrudedHover: { darkOffset: 12, lightOffset: -12, radius: 20, opacity: 1, elevation: 9 },
    extrudedSmall: { darkOffset: 5, lightOffset: -5, radius: 10, opacity: 1, elevation: 4 },
    pressed: { darkOffset: 3, lightOffset: -3, radius: 7, opacity: 0.7, elevation: 1 },
    pressedDeep: { darkOffset: 2, lightOffset: -2, radius: 5, opacity: 0.45, elevation: 0 },
    pressedSmall: { darkOffset: 2, lightOffset: -2, radius: 5, opacity: 0.55, elevation: 0 },
  },
  dark: {
    extruded: { darkOffset: 8, lightOffset: -8, radius: 14, opacity: 1, elevation: 7 },
    extrudedHover: { darkOffset: 11, lightOffset: -11, radius: 18, opacity: 1, elevation: 9 },
    extrudedSmall: { darkOffset: 4, lightOffset: -4, radius: 8, opacity: 1, elevation: 4 },
    pressed: { darkOffset: 3, lightOffset: -3, radius: 6, opacity: 0.75, elevation: 1 },
    pressedDeep: { darkOffset: 2, lightOffset: -2, radius: 4, opacity: 0.5, elevation: 0 },
    pressedSmall: { darkOffset: 2, lightOffset: -2, radius: 4, opacity: 0.6, elevation: 0 },
  },
};

export function getSoftShadow(theme: SoftTheme, depth: SoftDepth): { dark: ViewStyle; light: ViewStyle } {
  const base = shadowBase[theme];
  const recipe = recipes[theme][depth];

  return {
    dark: {
      shadowColor: base.dark,
      shadowOffset: { width: recipe.darkOffset, height: recipe.darkOffset },
      shadowOpacity: recipe.opacity,
      shadowRadius: recipe.radius,
      elevation: recipe.elevation,
    },
    light: {
      shadowColor: base.light,
      shadowOffset: { width: recipe.lightOffset, height: recipe.lightOffset },
      shadowOpacity: recipe.opacity,
      shadowRadius: recipe.radius,
    },
  };
}

export const FocusRing = {
  light: {
    shadowColor: 'rgba(108,99,255,0.45)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  dark: {
    shadowColor: 'rgba(139,132,255,0.55)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 2,
  },
} as const;
