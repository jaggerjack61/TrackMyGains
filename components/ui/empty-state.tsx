import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconBadge, type IconName } from '@/components/ui/icon-badge';
import { useTheme } from '@/hooks/use-theme';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  accent?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, message, accent, action, style }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <IconBadge icon={icon} color={accent ?? colors.tint} size={64} />
      <View style={styles.text}>
        <ThemedText type="heading" style={styles.center}>
          {title}
        </ThemedText>
        {message && (
          <ThemedText type="caption" tone="muted" style={[styles.center, styles.message]}>
            {message}
          </ThemedText>
        )}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 16,
  },
  text: {
    gap: 6,
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
  message: {
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 20,
  },
});
