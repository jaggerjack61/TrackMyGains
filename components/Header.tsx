import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack = true, rightAction }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={{ backgroundColor, paddingTop: insets.top }}>
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
  }
});
