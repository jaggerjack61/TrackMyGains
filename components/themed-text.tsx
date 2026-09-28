import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextTone = 'default' | 'muted' | 'subtle' | 'tint' | 'danger' | 'success';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  tone?: TextTone;
  type?:
    | 'default'
    | 'defaultSemiBold'
    | 'title'
    | 'subtitle'
    | 'heading'
    | 'display'
    | 'caption'
    | 'overline'
    | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  tone = 'default',
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const { scheme, colors } = useTheme();
  const toneColors: Record<TextTone, string> = {
    default: colors.text,
    muted: colors.mutedText,
    subtle: colors.subtleText,
    tint: colors.tint,
    danger: colors.danger,
    success: colors.success,
  };
  const overrideColor = scheme === 'dark' ? darkColor : lightColor;
  const color = overrideColor ?? (type === 'link' ? colors.tint : toneColors[tone]);

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts?.sans,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts?.sansBold,
  },
  display: {
    fontSize: 40,
    lineHeight: 46,
    fontFamily: Fonts?.display,
    letterSpacing: -1.2,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: Fonts?.display,
    letterSpacing: -0.8,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: Fonts?.displayBold,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: Fonts?.displayBold,
    letterSpacing: -0.3,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts?.sans,
  },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts?.sansBold,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  link: {
    lineHeight: 22,
    fontSize: 16,
    fontFamily: Fonts?.sansBold,
  },
});
