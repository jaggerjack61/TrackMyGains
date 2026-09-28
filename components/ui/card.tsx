import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getElevation, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardVariant = 'elevated' | 'muted' | 'outline';

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  padded?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Card({
  children,
  style,
  variant = 'elevated',
  padded = true,
  onPress,
  onLongPress,
  disabled,
  accessibilityLabel,
}: CardProps) {
  const { scheme, colors } = useTheme();

  const surfaceStyle: ViewStyle =
    variant === 'muted'
      ? { backgroundColor: colors.cardMuted, borderColor: 'transparent' }
      : variant === 'outline'
        ? { backgroundColor: 'transparent', borderColor: colors.border }
        : { backgroundColor: colors.card, borderColor: colors.border, ...getElevation(scheme, 1) };

  const baseStyle = [styles.card, padded && styles.padded, surfaceStyle, style];

  if (!onPress && !onLongPress) {
    return <View style={baseStyle}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [baseStyle, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: {
    padding: Spacing.card,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
