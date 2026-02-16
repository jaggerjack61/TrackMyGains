import { Colors, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

interface DashboardCardProps {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
}

export function DashboardCard({ title, icon, onPress }: DashboardCardProps) {
  const theme = useColorScheme() ?? 'light';
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'tint');
  const iconBackgroundColor = useThemeColor({}, 'tintSoft');
  const rippleColor = withAlpha(Colors[theme].tint, theme === 'dark' ? 0.18 : 0.12);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardContainer,
        { backgroundColor: cardBackgroundColor, borderColor },
        pressed ? styles.cardPressed : undefined,
      ]}
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      accessibilityRole="button">
      <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
        <MaterialCommunityIcons name={icon} size={28} color={iconColor} />
      </View>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%', // Approx half width for 2-column layout
    aspectRatio: 1, // Square cards
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    textAlign: 'center',
  },
});
