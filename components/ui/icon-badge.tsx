import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { readableTextOn, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface IconBadgeProps {
  icon: IconName;
  color: string;
  size?: number;
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A rounded tile holding an icon, tinted with a soft wash of `color`. */
export function IconBadge({ icon, color, size = 44, solid = false, style }: IconBadgeProps) {
  const { scheme } = useTheme();
  const backgroundColor = solid ? color : withAlpha(color, scheme === 'dark' ? 0.18 : 0.12);

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor },
        style,
      ]}>
      <MaterialCommunityIcons name={icon} size={Math.round(size * 0.5)} color={solid ? readableTextOn(color) : color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
