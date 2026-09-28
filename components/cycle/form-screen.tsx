import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '@/components/Header';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

interface FormScreenProps {
  eyebrow: string;
  title: string;
  accent: string;
  children: React.ReactNode;
  /** Pinned action bar at the bottom of the screen. */
  footer: React.ReactNode;
}

/** Full-screen form layout with a large header and a pinned bottom action. */
export function FormScreen({ eyebrow, title, accent, children, footer }: FormScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <Header eyebrow={eyebrow} accent={accent} title={title} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: colors.border, backgroundColor: colors.background },
          ]}>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
