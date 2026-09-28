import type { AbstractChartConfig } from 'react-native-chart-kit/dist/AbstractChart';

import { withAlpha, type ThemeColors } from '@/constants/theme';

interface LineChartThemeOptions {
  colors: ThemeColors;
  color: string;
  decimalPlaces?: number;
  dotRadius?: number;
}

/** Shared chart-kit styling: card-coloured canvas, faint dashed grid, soft area fill. */
export function buildLineChartConfig({
  colors,
  color,
  decimalPlaces = 0,
  dotRadius = 4,
}: LineChartThemeOptions): AbstractChartConfig {
  return {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces,
    color: (opacity = 1) => withAlpha(color, opacity),
    labelColor: () => colors.subtleText,
    fillShadowGradientFrom: color,
    fillShadowGradientFromOpacity: 0.22,
    fillShadowGradientTo: color,
    fillShadowGradientToOpacity: 0,
    strokeWidth: 2.5,
    propsForBackgroundLines: {
      stroke: colors.border,
      strokeDasharray: '4 6',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: '600',
    },
    propsForDots: {
      r: String(dotRadius),
      strokeWidth: '2',
      stroke: colors.card,
      fill: color,
    },
  };
}
