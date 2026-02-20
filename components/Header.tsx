import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  email: string | null;
  onLogout: () => void;
  onSync: () => Promise<void>;
}

export function Header({ title, showBack = true, rightAction }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View
      style={{
        backgroundColor,
        paddingTop: insets.top,
        borderBottomColor: borderColor,
        borderBottomWidth: StyleSheet.hairlineWidth,
      }}
    >
      <View style={styles.headerContent}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <MaterialCommunityIcons name="arrow-left" size={24} color={textColor} />
          </TouchableOpacity>
        )}
        <ThemedText type="subtitle" style={styles.title} numberOfLines={1}>{title}</ThemedText>
        <View style={styles.rightAction}>{rightAction}</View>
      </View>
    </View>
  );
}

export function ProfileMenu({ isOpen, onClose, email, onLogout, onSync }: ProfileMenuProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const drawerWidth = Math.min(320, width * 0.82);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (isVisible) {
      Animated.timing(translateX, {
        toValue: -drawerWidth,
        duration: 500,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsVisible(false);
        }
      });
    }
  }, [drawerWidth, isOpen, isVisible, translateX]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal transparent visible={isVisible} animationType="none" onRequestClose={onClose}>
      <View style={styles.menuOverlay}>
        <Pressable style={styles.menuBackdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.menuContainer,
            {
              width: drawerWidth,
              backgroundColor: cardColor,
              borderColor,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.menuHeader}>
            <ThemedText type="subtitle">Profile</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={22} color={textColor} />
            </TouchableOpacity>
          </View>
          <View style={styles.menuSection}>
            <ThemedText style={[styles.menuLabel, { color: mutedTextColor }]}>Signed in as</ThemedText>
            <ThemedText numberOfLines={1}>{email ?? 'Unknown user'}</ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: cardColor, borderColor }, isSyncing && styles.buttonDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            <MaterialCommunityIcons name="cloud-sync" size={20} color={tintColor} />
            <ThemedText style={[styles.syncText, { color: tintColor }]}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: tintSoft, borderColor }]}
            onPress={onLogout}
          >
            <MaterialCommunityIcons name="logout" size={20} color={tintColor} />
            <ThemedText style={[styles.logoutText, { color: tintColor }]}>Logout</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 14,
    paddingVertical: 4,
    paddingRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 30,
    lineHeight: 32,
  },
  rightAction: {
    marginLeft: 16,
  },
  menuOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  menuContainer: {
    height: '100%',
    borderRightWidth: 1,
    paddingHorizontal: 24,
    gap: 24,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,26,26,0.16)',
    paddingBottom: 16,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  menuSection: {
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,26,26,0.12)',
    paddingBottom: 16,
  },
  menuLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.4,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
  },
  syncText: {
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    fontSize: 11,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
  },
  logoutText: {
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    fontSize: 11,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
