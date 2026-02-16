import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import 'react-native-reanimated';

import CustomSplashScreen from '@/components/SplashScreen';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isSplashAnimationFinished, setIsSplashAnimationFinished] = useState(false);
  const [fontsLoaded] = useFonts(MaterialCommunityIcons.font);

  if (!fontsLoaded) {
    return null;
  }

  if (!isSplashAnimationFinished) {
    return (
      <CustomSplashScreen onFinish={() => setIsSplashAnimationFinished(true)} />
    );
  }

  const themeName = colorScheme ?? 'light';
  const baseTheme = themeName === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: Colors[themeName].tint,
      background: Colors[themeName].background,
      card: Colors[themeName].card,
      text: Colors[themeName].text,
      border: Colors[themeName].border,
      notification: Colors[themeName].tint,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="track-cycle" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
