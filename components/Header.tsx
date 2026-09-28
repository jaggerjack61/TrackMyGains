import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/button';
import type { IconName } from '@/components/ui/icon-badge';
import { Sheet } from '@/components/ui/sheet';
import { Fonts, Radii, readableTextOn } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface HeaderProps {
  title: string;
  /** Small label above the title, e.g. the section name. */
  eyebrow?: string;
  /** Colours the eyebrow; usually the section accent. */
  accent?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  email: string | null;
  onLogout: () => void;
  onSync: () => Promise<void>;
  onCheckUpdates?: () => Promise<void>;
}

/** Screen header: back button row, then a large title. */
export function Header({ title, eyebrow, accent, showBack = true, rightAction }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        {showBack ? (
          <IconButton icon="arrow-left" variant="surface" onPress={() => router.back()} accessibilityLabel="Go back" />
        ) : (
          <View />
        )}
        <View style={styles.rightAction}>{rightAction}</View>
      </View>
      <View style={styles.titleBlock}>
        {eyebrow && (
          <ThemedText type="overline" style={{ color: accent ?? colors.mutedText }}>
            {eyebrow}
          </ThemedText>
        )}
        <ThemedText type="title" numberOfLines={2} style={styles.title}>
          {title}
        </ThemedText>
      </View>
    </View>
  );
}

/** Circular avatar with the first letter of the user's email. */
export function Avatar({ email, onPress, size = 40 }: { email: string | null; onPress?: () => void; size?: number }) {
  const { colors } = useTheme();
  const initial = (email?.trim()[0] ?? '?').toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel="Open profile"
      style={({ pressed }) => [
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.tint },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={[styles.avatarText, { color: readableTextOn(colors.tint), fontSize: size * 0.42 }]}>
        {initial}
      </ThemedText>
    </Pressable>
  );
}

interface MenuRowProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  busyLabel?: string;
  isBusy?: boolean;
  tone?: 'default' | 'danger';
  showDivider?: boolean;
}

export function MenuRow({ icon, label, onPress, busyLabel, isBusy = false, tone = 'default', showDivider = false }: MenuRowProps) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isBusy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.menuRow,
        showDivider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        pressed && { backgroundColor: colors.cardMuted },
      ]}>
      <View style={[styles.menuIcon, { backgroundColor: tone === 'danger' ? colors.dangerSoft : colors.tintSoft }]}>
        <MaterialCommunityIcons name={icon} size={18} color={tone === 'danger' ? colors.danger : colors.tint} />
      </View>
      <ThemedText type="defaultSemiBold" style={[styles.menuLabel, { color }]}>
        {isBusy && busyLabel ? busyLabel : label}
      </ThemedText>
      {isBusy ? (
        <ActivityIndicator size="small" color={colors.mutedText} />
      ) : (
        tone !== 'danger' && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.subtleText} />
      )}
    </Pressable>
  );
}

export function ProfileMenu({ isOpen, onClose, email, onLogout, onSync, onCheckUpdates }: ProfileMenuProps) {
  const { colors } = useTheme();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const canCheckUpdates = Platform.OS === 'android' && onCheckUpdates;

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckUpdates = async () => {
    if (isCheckingUpdates || !onCheckUpdates) return;
    setIsCheckingUpdates(true);
    try {
      await onCheckUpdates();
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  return (
    <Sheet visible={isOpen} onClose={onClose}>
      <View style={styles.profileHeader}>
        <Avatar email={email} size={56} />
        <View style={styles.profileText}>
          <ThemedText type="overline" tone="subtle">
            Signed in as
          </ThemedText>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {email ?? 'Unknown user'}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuRow icon="cloud-sync-outline" label="Sync now" busyLabel="Syncing…" isBusy={isSyncing} onPress={handleSync} />
        {canCheckUpdates && (
          <MenuRow
            icon="update"
            label="Check for updates"
            busyLabel="Checking…"
            isBusy={isCheckingUpdates}
            onPress={handleCheckUpdates}
            showDivider
          />
        )}
        <MenuRow icon="logout" label="Log out" tone="danger" onPress={onLogout} showDivider />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 14,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleBlock: {
    gap: 4,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts?.displayBold,
  },
  pressed: {
    opacity: 0.85,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
  },
  profileText: {
    flex: 1,
    gap: 4,
  },
  menuGroup: {
    borderRadius: Radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
  },
});
