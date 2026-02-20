import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SoftButton, SoftSurface } from '@/components/ui/soft-ui';
import { Radii } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ModalScreen() {
  const tintColor = useThemeColor({}, 'tint');

  return (
    <ThemedView style={styles.container}>
      <SoftSurface depth="extruded" radius={Radii.container} contentStyle={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Quick actions
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Use this space for shortcuts like “Add weight”, “Log workout”, or “Start timer”.
        </ThemedText>
        <Link href="/" dismissTo asChild>
          <SoftButton depth="extruded" activeDepth="pressed" contentStyle={[styles.button, { backgroundColor: tintColor }]}>
            <ThemedText lightColor="#FFFFFF" darkColor="#0B0E14" style={styles.buttonText}>
              Back to home
            </ThemedText>
          </SoftButton>
        </Link>
      </SoftSurface>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    padding: 20,
    borderRadius: Radii.container,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 18,
  },
  button: {
    paddingVertical: 14,
    borderRadius: Radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
