import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import CustomSplashScreen from '@/components/SplashScreen';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [isSplashAnimationFinished, setIsSplashAnimationFinished] = useState(false);

  useEffect(() => {
    // Perform some resource loading here if needed
    // For now we just mark as ready immediately
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) {
      // Hide the native splash screen immediately when we are ready
      // The CustomSplashScreen will take over
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isSplashAnimationFinished) {
    return (
      <CustomSplashScreen onFinish={() => setIsSplashAnimationFinished(true)} />
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="track-cycle" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
