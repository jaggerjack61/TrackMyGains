import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Fonts, getElevation } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_BAR_HEIGHT = 64;

export default function TabLayout() {
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: Math.max(insets.bottom, 12),
          height: TAB_BAR_HEIGHT,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: TAB_BAR_HEIGHT / 2,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.tabBarBackground,
          ...getElevation(scheme, 2),
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons size={24} name={focused ? 'home-variant' : 'home-variant-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons size={24} name={focused ? 'cog' : 'cog-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts?.sansBold,
    fontSize: 11,
    marginTop: 2,
  },
});
