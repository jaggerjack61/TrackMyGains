import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { manualCheckForUpdates } from '@/services/app-updates';
import { bidirectionalSync, getFirebaseAuth } from '@/services/firebase';

export const useProfileMenuActions = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), user => {
      setUserEmail(user?.email ?? null);
    });
    return unsubscribe;
  }, []);

  const closeProfile = useCallback(() => setIsProfileOpen(false), []);
  const openProfile = useCallback(() => setIsProfileOpen(true), []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(getFirebaseAuth());
      closeProfile();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Logout failed', message);
    }
  }, [closeProfile]);

  const handleSync = useCallback(async () => {
    const { status, stats } = await bidirectionalSync({ force: true });
    if (status === 'success') {
      const pushed = Object.values(stats?.pushed ?? {}).reduce((sum, count) => sum + count, 0);
      const pulled = Object.values(stats?.pulled ?? {}).reduce((sum, count) => sum + count, 0);
      Alert.alert(
        'Sync complete',
        `Pushed: ${pushed}\nPulled: ${pulled}\nDeleted: ${stats?.deleted ?? 0}\nConflicts resolved: ${stats?.conflicts ?? 0}`,
      );
      return;
    }

    const messages: Partial<Record<typeof status, [string, string]>> = {
      offline: ['Offline', 'Connect to the internet to sync your data.'],
      unauthenticated: ['Not signed in', 'Sign in to sync your data.'],
      'permission-denied': ['Sync blocked', 'Firestore rules are blocking access.'],
      busy: ['Sync in progress', 'A sync is already running.'],
      skipped: ['Already synced', 'Your data was synced recently.'],
      failed: ['Sync failed', 'Please try again.'],
    };
    const [title, message] = messages[status] ?? ['Sync failed', 'Please try again.'];
    Alert.alert(title, message);
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    const result = await manualCheckForUpdates();
    if (result.error) Alert.alert('Update check failed', result.error);
    else if (!result.updateAvailable) Alert.alert('No updates', 'You have the latest version.');
  }, []);

  return {
    closeProfile,
    handleCheckUpdates,
    handleLogout,
    handleSync,
    isProfileOpen,
    openProfile,
    userEmail,
  };
};
