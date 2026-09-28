import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface SectionHeaderProps {
  title: string;
  caption?: string;
  action?: { label: string; onPress: () => void };
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, caption, action, trailing, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.text}>
        <ThemedText type="heading">{title}</ThemedText>
        {caption && (
          <ThemedText type="caption" tone="muted">
            {caption}
          </ThemedText>
        )}
      </View>
      {trailing}
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
          <ThemedText type="caption" tone="tint" style={styles.action}>
            {action.label}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  action: {
    fontWeight: '700',
  },
});
