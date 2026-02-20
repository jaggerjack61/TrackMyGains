import { Colors, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { SoftSurface } from './ui/soft-ui';

interface DashboardCardProps {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
}

export function DashboardCard({ title, icon, onPress }: DashboardCardProps) {
  const theme = useColorScheme() ?? 'light';
  const iconColor = useThemeColor({}, 'tint');
  const rippleColor = withAlpha(Colors[theme].tint, theme === 'dark' ? 0.18 : 0.12);

  return (
    <Pressable
      style={styles.cardContainer}
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      accessibilityRole="button">
      {({ pressed }) => (
        <SoftSurface
          depth={pressed ? 'pressed' : 'extruded'}
          radius={32}
          contentStyle={styles.cardContent}>
          <SoftSurface depth="pressedDeep" radius={16} style={styles.iconWell} contentStyle={styles.iconWellContent}>
            <MaterialCommunityIcons name={icon} size={28} color={iconColor} />
          </SoftSurface>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {title}
          </ThemedText>
        </SoftSurface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '48%', // Approx half width for 2-column layout
    aspectRatio: 1, // Square cards
    marginBottom: 16,
  },
  cardContent: {
    borderRadius: 32,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWell: {
    marginBottom: 14,
  },
  iconWellContent: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
});
