import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardCard } from '@/components/DashboardCard';
import { ProfileMenu } from '@/components/Header';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Colors, withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getFirebaseAuth, syncLocalDataToFirestore } from '@/services/firebase';

export default function HomeScreen() {
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const tintColor = useThemeColor({}, 'tint');
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
            <MaterialCommunityIcons name="dumbbell" size={96} color={tintColor} style={styles.headerIcon} />
            <View style={styles.headerText}>
              <ThemedText type="title" style={styles.brand}>
                Track My Gains
              </ThemedText>
              <ThemedText style={[styles.tagline, { color: mutedTextColor }]}>
                Log workouts, weight, diet, and cycles
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={220}
              color={withAlpha(tintColor, 0.12)}
              style={styles.headerBgIcon}
            />
          </View>
        }>
        <View style={styles.titleContainer}>
          <ThemedText type="title">Welcome back</ThemedText>
        </View>
        <ThemedText style={[styles.subtitle, { color: mutedTextColor }]}>
          What would you like to track today?
        </ThemedText>
        
        <View style={styles.gridContainer}>
          <DashboardCard 
            title="Track Weight" 
            icon="scale-bathroom" 
            onPress={() => router.push('/track-weight')}
          />
          <DashboardCard 
            title="Track Workouts" 
            icon="dumbbell" 
            onPress={() => router.push('/track-workouts')}
          />
          <DashboardCard 
            title="Track Diet" 
            icon="food-apple" 
            onPress={() => router.push('/track-diet')}
          />
          <DashboardCard 
            title="Track Cycle" 
            icon="needle" 
            onPress={() => router.push('/track-cycle')}
          />
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 12,
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
  headerIcon: {
    marginTop: 12,
    marginLeft: 8,
  },
  brand: {
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 20,
    maxWidth: 280,
  },
  headerBgIcon: {
    position: 'absolute',
    right: -60,
    top: -40,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
});
