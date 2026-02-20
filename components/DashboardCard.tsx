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
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '48%', // Approx half width for 2-column layout
    aspectRatio: 1, // Square cards
    marginBottom: 16,
    borderWidth: 0,
    borderTopWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardPressed: {
    transform: [{ scale: 0.995 }],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
  },
});
