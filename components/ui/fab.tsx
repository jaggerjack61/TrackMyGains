import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui/icon-badge';
import { Fonts, getElevation, readableTextOn } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FabProps {
  onPress: () => void;
  label?: string;
  icon?: IconName;
  color?: string;
  accessibilityLabel?: string;
}

/** Floating primary action, pinned bottom-right above the safe area. */
export function Fab({ onPress, label, icon = 'plus', color, accessibilityLabel }: FabProps) {
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const background = color ?? colors.tint;
  const foreground = color ? readableTextOn(background) : colors.onTint;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? 'Add'}
      style={({ pressed }) => [
        styles.fab,
        label ? styles.extended : styles.round,
        { backgroundColor: background, bottom: Math.max(insets.bottom, 12) + 12 },
        getElevation(scheme, 3, background),
        pressed && styles.pressed,
      ]}>
      <MaterialCommunityIcons name={icon} size={24} color={foreground} />
      {label && <Text style={[styles.label, { color: foreground }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  round: {
    width: 56,
  },
  extended: {
    paddingLeft: 18,
    paddingRight: 22,
  },
  label: {
    fontFamily: Fonts?.sansBold,
    fontSize: 15,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
