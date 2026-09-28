import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/button';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** Pinned below the scrollable content, e.g. the primary action. */
  footer?: React.ReactNode;
  /** Lets list content (e.g. a SectionList) manage its own scrolling. */
  scrollable?: boolean;
  /** Fixed height fraction of the window; otherwise the sheet sizes to content. */
  heightRatio?: number;
}

/** Bottom sheet used for every add/edit form in the app. */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scrollable = true,
  heightRatio,
}: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(48)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(48);
    Animated.spring(translateY, {
      toValue: 0,
      damping: 22,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  const maxHeight = windowHeight * 0.9;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              maxHeight,
              height: heightRatio ? windowHeight * heightRatio : undefined,
              paddingBottom: Math.max(insets.bottom, 16) + 4,
              transform: [{ translateY }],
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={styles.headerText}>
                {title && <ThemedText type="subtitle">{title}</ThemedText>}
                {subtitle && (
                  <ThemedText type="caption" tone="muted">
                    {subtitle}
                  </ThemedText>
                )}
              </View>
              <IconButton icon="close" variant="soft" color={colors.mutedText} size={34} iconSize={18} onPress={onClose} accessibilityLabel="Close" />
            </View>
          )}
          {scrollable ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.content, styles.fill]}>{children}</View>
          )}
          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 16,
  },
  fill: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
