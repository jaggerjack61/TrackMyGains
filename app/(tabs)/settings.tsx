import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileMenu } from '@/components/Header';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { exportDatabase, importDatabase } from '@/services/database';
import { getFirebaseAuth, syncLocalDataToFirestore } from '@/services/firebase';

export default function SettingsScreen() {
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUserEmail(user?.email ?? null);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      setIsProfileOpen(false);
      router.replace('/auth');
    } catch (error: any) {
      Alert.alert('Logout failed', error?.message ?? 'Please try again.');
    }
  };

  const handleSync = async () => {
    const { status, counts } = await syncLocalDataToFirestore({ force: true });
    if (status === 'success') {
      const total = counts ? Object.values(counts).reduce((sum, value) => sum + value, 0) : 0;
      const message = total === 0 ? 'No local data found to sync.' : `Synced ${total} items.`;
      Alert.alert('Sync complete', message);
      return;
    }
    if (status === 'offline') {
      Alert.alert('Offline', 'Connect to the internet to sync your data.');
      return;
    }
    if (status === 'unauthenticated') {
      Alert.alert('Not signed in', 'Sign in to sync your data.');
      return;
    }
    if (status === 'permission-denied') {
      Alert.alert('Sync blocked', 'Firestore rules are blocking access.');
      return;
    }
    if (status === 'busy') {
      Alert.alert('Sync in progress', 'A sync is already running.');
      return;
    }
    if (status === 'skipped') {
      Alert.alert('Already synced', 'Your data was synced recently.');
      return;
    }
    Alert.alert('Sync failed', 'Please try again.');
  };

  const handleExport = async () => {
    try {
      await exportDatabase();
    } catch (error: any) {
      Alert.alert('Export Failed', error.message);
    }
  };

  const handleImport = async () => {
    try {
      Alert.alert(
        'Confirm Import',
        'This will overwrite your current database with the selected file. This action cannot be undone. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Import', 
            style: 'destructive',
            onPress: async () => {
              try {
                await importDatabase();
                Alert.alert('Success', 'Database imported successfully. Please restart the app to ensure all data is loaded correctly.');
              } catch (error: any) {
                Alert.alert('Import Failed', error.message);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: Colors.light.background, dark: Colors.dark.background }}
        headerImage={
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setIsProfileOpen(true)}
              style={[
                styles.menuButton,
                {
                  backgroundColor: withAlpha(tintColor, 0.16),
                  top: Math.max(insets.top, 16),
                },
              ]}
            >
              <MaterialCommunityIcons name="menu" size={22} color={tintColor} />
            </TouchableOpacity>
            <MaterialCommunityIcons name="cog-outline" size={92} color={tintColor} />
            <View style={styles.headerText}>
              <ThemedText type="title">Settings</ThemedText>
              <ThemedText style={[styles.tagline, { color: mutedTextColor }]}>
                Manage your preferences
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="cog"
              size={240}
              color={withAlpha(tintColor, 0.12)}
              style={styles.headerBgIcon}
            />
          </View>
        }>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Data Management</ThemedText>
        </ThemedView>
        <ThemedText style={[styles.intro, { color: mutedTextColor }]}>
          Backup or restore your data.
        </ThemedText>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
              style={[styles.button, { backgroundColor: cardColor, borderColor }]} 
              onPress={handleExport}
          >
              <MaterialCommunityIcons name="export" size={24} color={tintColor} style={styles.buttonIcon} />
              <View>
                  <ThemedText type="defaultSemiBold">Export Database</ThemedText>
                  <ThemedText style={{ color: mutedTextColor, fontSize: 12 }}>Save your data to a file</ThemedText>
              </View>
          </TouchableOpacity>

          <TouchableOpacity 
              style={[styles.button, { backgroundColor: cardColor, borderColor, marginTop: 12 }]} 
              onPress={handleImport}
          >
              <MaterialCommunityIcons name="import" size={24} color={tintColor} style={styles.buttonIcon} />
              <View>
                  <ThemedText type="defaultSemiBold">Import Database</ThemedText>
                  <ThemedText style={{ color: mutedTextColor, fontSize: 12 }}>Restore data from a backup</ThemedText>
              </View>
          </TouchableOpacity>
        </View>
        
      </ParallaxScrollView>
      <ProfileMenu
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        email={userEmail}
        onLogout={handleLogout}
        onSync={handleSync}
      />
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  intro: {
    marginBottom: 20,
  },
  header: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
    justifyContent: 'flex-end',
  },
  menuButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  headerText: {
    marginTop: 12,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 20,
    maxWidth: 280,
  },
  headerBgIcon: {
    position: 'absolute',
    right: -70,
    top: -60,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 2,
  },
  buttonIcon: {
    marginRight: 16,
  }
});
