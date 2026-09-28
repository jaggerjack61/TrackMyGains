import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconBadge, type IconName } from '@/components/ui/icon-badge';
import { useTheme } from '@/hooks/use-theme';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: IconName;
  accent: string;
  onPress?: () => void;
}

export function DashboardCard({ title, description, icon, accent, onPress }: DashboardCardProps) {
  const { colors } = useTheme();

  return (
    <Card onPress={onPress} accessibilityLabel={title} style={styles.card}>
      <View style={styles.top}>
        <IconBadge icon={icon} color={accent} size={46} />
        <MaterialCommunityIcons name="arrow-top-right" size={20} color={colors.subtleText} />
      </View>
      <View style={styles.text}>
        <ThemedText type="heading" numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="caption" tone="muted" numberOfLines={2}>
          {description}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 156,
    justifyContent: 'space-between',
    gap: 16,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  text: {
    gap: 4,
  },
});
