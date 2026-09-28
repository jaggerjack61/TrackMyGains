import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { IconName } from '@/components/ui/icon-badge';
import { Fonts, Radii, readableTextOn, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Overrides the primary/ghost colour, e.g. with a section accent. */
  color?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 54 };
const FONT_SIZES: Record<ButtonSize, number> = { sm: 14, md: 15, lg: 16 };

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'md',
  color,
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const accent = color ?? colors.tint;

  const palette: Record<ButtonVariant, { background: string; foreground: string }> = {
    primary: { background: accent, foreground: color ? readableTextOn(accent) : colors.onTint },
    secondary: { background: colors.cardMuted, foreground: colors.text },
    ghost: { background: 'transparent', foreground: accent },
    danger: { background: colors.dangerSoft, foreground: colors.danger },
  };
  const { background, foreground } = palette[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={{ color: withAlpha(foreground, 0.12), borderless: false }}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          borderRadius: size === 'sm' ? Radii.inner : Radii.control,
          paddingHorizontal: size === 'sm' ? 12 : 18,
          backgroundColor: background,
        },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon} size={FONT_SIZES[size] + 3} color={foreground} />}
          <Text style={[styles.label, { color: foreground, fontSize: FONT_SIZES[size] }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type IconButtonVariant = 'surface' | 'ghost' | 'soft' | 'solid';

interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  color?: string;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  color,
  size = 40,
  iconSize = 20,
  disabled,
  style,
}: IconButtonProps) {
  const { scheme, colors } = useTheme();
  const accent = color ?? (variant === 'surface' || variant === 'ghost' ? colors.text : colors.tint);

  const variantStyle: ViewStyle =
    variant === 'surface'
      ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }
      : variant === 'soft'
        ? { backgroundColor: withAlpha(accent, scheme === 'dark' ? 0.18 : 0.12) }
        : variant === 'solid'
          ? { backgroundColor: accent }
          : { backgroundColor: 'transparent' };
  const iconColor = variant === 'solid' ? readableTextOn(accent) : accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconBase,
        { width: size, height: size, borderRadius: size / 2 },
        variantStyle,
        pressed && (variant === 'ghost' ? { backgroundColor: withAlpha(accent, 0.1) } : styles.pressed),
        disabled && styles.disabled,
        style,
      ]}>
      <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  label: {
    fontFamily: Fonts?.sansBold,
  },
  iconBase: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
