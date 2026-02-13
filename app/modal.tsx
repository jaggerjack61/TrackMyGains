import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ModalScreen() {
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor }]}>
        <ThemedText type="title" style={styles.title}>
          Quick actions
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Use this space for shortcuts like “Add weight”, “Log workout”, or “Start timer”.
        </ThemedText>
        <Link href="/" dismissTo style={[styles.button, { backgroundColor: tintColor }]}>
          <ThemedText lightColor="#FFFFFF" darkColor="#0B0E14" style={styles.buttonText}>
            Back to home
          </ThemedText>
        </Link>
      </View>
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
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
