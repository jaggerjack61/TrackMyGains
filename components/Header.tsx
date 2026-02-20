import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SoftButton, SoftSurface } from '@/components/ui/soft-ui';
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

  return (
    <View
      style={{
        backgroundColor,
        paddingTop: insets.top,
      }}
    >
      <View style={styles.headerContent}>
        {showBack && (
          <SoftButton onPress={() => router.back()} style={styles.backButton} contentStyle={styles.iconAction}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={textColor} />
          </SoftButton>
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
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (isVisible) {
      Animated.timing(translateX, {
        toValue: -drawerWidth,
        duration: 200,
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
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateX }],
            },
          ]}
        >
          <SoftSurface depth="extruded" radius={32} contentStyle={styles.menuShell}>
            <View style={styles.menuHeader}>
              <ThemedText type="subtitle">Profile</ThemedText>
              <SoftButton onPress={onClose} style={styles.closeButton} contentStyle={styles.iconAction}>
                <MaterialCommunityIcons name="close" size={20} color={textColor} />
              </SoftButton>
            </View>
            <SoftSurface depth="pressedDeep" radius={16} contentStyle={styles.menuSection}>
              <ThemedText style={[styles.menuLabel, { color: mutedTextColor }]}>Signed in as</ThemedText>
              <ThemedText numberOfLines={1}>{email ?? 'Unknown user'}</ThemedText>
            </SoftSurface>
            <SoftButton
              style={isSyncing && styles.buttonDisabled}
              onPress={handleSync}
              disabled={isSyncing}
              contentStyle={styles.rowButton}
            >
              <MaterialCommunityIcons name="cloud-sync" size={20} color={tintColor} />
              <ThemedText style={[styles.syncText, { color: tintColor }]}>
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </ThemedText>
            </SoftButton>
            <SoftButton onPress={onLogout} contentStyle={[styles.rowButton, { backgroundColor: tintSoft }]}>
              <MaterialCommunityIcons name="logout" size={20} color={tintColor} />
              <ThemedText style={[styles.logoutText, { color: tintColor }]}>Logout</ThemedText>
            </SoftButton>
          </SoftSurface>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
  },
  iconAction: {
    width: 36,
    height: 36,
  },
  title: {
    flex: 1,
    fontSize: 20,
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
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menuContainer: {
    height: '100%',
    paddingHorizontal: 20,
  },
  menuShell: {
    gap: 20,
    borderRadius: 32,
    padding: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {},
  menuSection: {
    borderRadius: 16,
    gap: 6,
    padding: 14,
  },
  menuLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  syncText: {},
  logoutText: {},
  buttonDisabled: {
    opacity: 0.6,
  },
});
