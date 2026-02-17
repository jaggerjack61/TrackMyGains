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

export function ProfileMenu({ isOpen, onClose, email, onLogout }: ProfileMenuProps) {
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
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
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    gap: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 6,
  },
  menuSection: {
    gap: 6,
  },
  menuLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoutText: {
    fontWeight: '600',
  },
});
