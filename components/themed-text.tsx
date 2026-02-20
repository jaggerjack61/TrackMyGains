import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'label' | 'hero';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const defaultColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({ light: lightColor, dark: darkColor }, 'tint');

  return (
    <Text
      style={[
        { color: type === 'link' ? linkColor : defaultColor },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'label' ? styles.label : undefined,
        type === 'hero' ? styles.hero : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontFamily: Fonts?.sans,
  },
  defaultSemiBold: {
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontFamily: Fonts?.sansMedium ?? Fonts?.sans,
  },
  title: {
    fontSize: Typography.title.fontSize,
    lineHeight: Typography.title.lineHeight,
    letterSpacing: Typography.title.letterSpacing,
    fontFamily: Fonts?.serif,
  },
  subtitle: {
    fontSize: Typography.subtitle.fontSize,
    lineHeight: Typography.subtitle.lineHeight,
    letterSpacing: Typography.subtitle.letterSpacing,
    fontFamily: Fonts?.sans,
  },
  hero: {
    fontSize: Typography.hero.fontSize,
    lineHeight: Typography.hero.lineHeight,
    letterSpacing: Typography.hero.letterSpacing,
    fontFamily: Fonts?.serif,
  },
  label: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    letterSpacing: Typography.label.letterSpacing,
    textTransform: 'uppercase',
    fontFamily: Fonts?.sansMedium ?? Fonts?.sans,
  },
  link: {
    lineHeight: Typography.body.lineHeight,
    fontSize: Typography.body.fontSize,
    fontFamily: Fonts?.sansMedium ?? Fonts?.sans,
  },
});
