import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import CustomSplashScreen from '@/components/SplashScreen';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getFirebaseAuth, startFirestoreAutoSync, stopFirestoreAutoSync } from '@/services/firebase';

export const unstable_settings = {
  anchor: 'auth/index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isSplashAnimationFinished, setIsSplashAnimationFinished] = useState(false);
  const [fontsLoaded] = useFonts(MaterialCommunityIcons.font);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      setHasUser(Boolean(user));
      setIsAuthResolved(true);
      if (user) {
        startFirestoreAutoSync();
      } else {
        stopFirestoreAutoSync();
      }
    });
    return () => {
      unsubscribe();
      stopFirestoreAutoSync();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  if (!isSplashAnimationFinished || !isAuthResolved) {
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

  const initialRouteName = hasUser ? '(tabs)' : 'auth/index';

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack initialRouteName={initialRouteName}>
        <Stack.Screen name="auth/index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="track-cycle" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
