import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans/800ExtraBold";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    bidirectionalSync,
    getFirebaseAuth,
    startFirestoreAutoSync,
    stopFirestoreAutoSync,
} from "@/services/firebase";
import { promptForUpdateIfAvailable } from "@/services/app-updates";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    "DM Sans Regular": DMSans_400Regular,
    "DM Sans Medium": DMSans_500Medium,
    "DM Sans Bold": DMSans_700Bold,
    "Plus Jakarta Sans SemiBold": PlusJakartaSans_600SemiBold,
    "Plus Jakarta Sans Bold": PlusJakartaSans_700Bold,
    "Plus Jakarta Sans ExtraBold": PlusJakartaSans_800ExtraBold,
  });
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setHasUser(Boolean(user));
      setIsAuthResolved(true);
      if (user) {
        console.log(
          "[App] User logged in, starting initial bidirectional sync...",
        );
        await bidirectionalSync({ force: true });
        if (auth.currentUser?.uid === user.uid) {
          startFirestoreAutoSync();
        }
      } else {
        stopFirestoreAutoSync();
      }
    });
    return () => {
      unsubscribe();
      stopFirestoreAutoSync();
    };
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !isAuthResolved) return;
    void promptForUpdateIfAvailable();
  }, [fontsLoaded, isAuthResolved]);

  if (!fontsLoaded) {
    return null;
  }

  if (!isAuthResolved) return null;

  const themeName = colorScheme ?? "light";
  const baseTheme = themeName === "dark" ? DarkTheme : DefaultTheme;
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
        <Stack.Protected guard={hasUser}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="track-cycle" options={{ headerShown: false }} />
          <Stack.Screen name="track-diet/index" options={{ headerShown: false }} />
          <Stack.Screen name="track-diet/[dietId]/index" options={{ headerShown: false }} />
          <Stack.Screen name="track-diet/[dietId]/[date]/index" options={{ headerShown: false }} />
          <Stack.Screen name="track-weight/index" options={{ headerShown: false }} />
          <Stack.Screen name="track-workouts/index" options={{ headerShown: false }} />
          <Stack.Screen name="track-workouts/[routineId]/index" options={{ headerShown: false }} />
          <Stack.Screen name="track-workouts/[routineId]/[workoutId]/index" options={{ headerShown: false }} />
          <Stack.Screen name="track-workouts/[routineId]/[workoutId]/[exerciseId]/index" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasUser}>
          <Stack.Screen name="auth/index" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
