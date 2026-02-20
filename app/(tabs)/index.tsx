import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DashboardCard } from "@/components/DashboardCard";
import { ProfileMenu } from "@/components/Header";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { Colors, Fonts, withAlpha } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { bidirectionalSync, getFirebaseAuth } from "@/services/firebase";

export default function HomeScreen() {
  const mutedTextColor = useThemeColor({}, "mutedText");
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? null);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      setIsProfileOpen(false);
      router.replace("/auth");
    } catch (error: any) {
      Alert.alert("Logout failed", error?.message ?? "Please try again.");
    }
  };

  const handleSync = async () => {
    const { status, stats } = await bidirectionalSync({ force: true });
    if (status === "success") {
      const pushed = stats
        ? Object.values(stats.pushed).reduce((a, b) => a + b, 0)
        : 0;
      const pulled = stats
        ? Object.values(stats.pulled).reduce((a, b) => a + b, 0)
        : 0;
      Alert.alert("Sync complete", `Pushed: ${pushed}\nPulled: ${pulled}`);
      return;
    }
    if (status === "offline") {
      Alert.alert("Offline", "Connect to the internet to sync your data.");
      return;
    }
    if (status === "unauthenticated") {
      Alert.alert("Not signed in", "Sign in to sync your data.");
      return;
    }
    if (status === "permission-denied") {
      Alert.alert("Sync blocked", "Firestore rules are blocking access.");
      return;
    }
    if (status === "busy") {
      Alert.alert("Sync in progress", "A sync is already running.");
      return;
    }
    if (status === "skipped") {
      Alert.alert("Already synced", "Your data was synced recently.");
      return;
    }
    Alert.alert("Sync failed", "Please try again.");
  };

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{
          light: Colors.light.background,
          dark: Colors.dark.background,
        }}
        headerImage={
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setIsProfileOpen(true)}
              style={[
                styles.menuButton,
                {
                  backgroundColor: withAlpha(tintColor, 0.16),
                  top: Math.max(insets.top, 16),
                },
              ]}
            >
              <MaterialCommunityIcons name="menu" size={22} color={tintColor} />
            </TouchableOpacity>
            <MaterialCommunityIcons
              name="dumbbell"
              size={84}
              color={tintColor}
              style={styles.headerIcon}
            />
            <View style={styles.headerText}>
              
              <ThemedText type="hero" style={styles.brand}>
                Track
                <ThemedText
                  type="hero"
                  style={[styles.brandEmphasis, { color: tintColor, fontFamily: Fonts?.serifItalic ?? Fonts?.serif }]}
                >
                  {" "}
                  Gains
                </ThemedText>
              </ThemedText>
              <ThemedText style={[styles.tagline, { color: mutedTextColor }]}>
                Log workouts, weight, diet, and cycles
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={200}
              color={withAlpha(tintColor, 0.12)}
              style={styles.headerBgIcon}
            />
          </View>
        }
      >
        <View style={styles.sectionHeading}>
          <ThemedText type="label" style={{ color: mutedTextColor }}>
            Dashboard
          </ThemedText>
          <ThemedText type="title">Welcome back</ThemedText>
        </View>
        <ThemedText style={[styles.subtitle, { color: mutedTextColor }]}>
          What would you like to track today?
        </ThemedText>

        <View style={styles.gridContainer}>
          <DashboardCard
            title="Track Weight"
            icon="scale-bathroom"
            onPress={() => router.push("/track-weight")}
          />
          <DashboardCard
            title="Track Workouts"
            icon="dumbbell"
            onPress={() => router.push("/track-workouts")}
          />
          <DashboardCard
            title="Track Diet"
            icon="food-apple"
            onPress={() => router.push("/track-diet")}
          />
          <DashboardCard
            title="Track Cycle"
            icon="needle"
            onPress={() => router.push("/track-cycle")}
          />
        </View>
      </ParallaxScrollView>
      <ProfileMenu
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        email={userEmail}
        onLogout={handleLogout}
        onSync={handleSync}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    gap: 10,
    marginBottom: 2,
  },
  subtitle: {
    marginBottom: 18,
    maxWidth: 320,
  },
  header: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 68,
    paddingBottom: 34,
    justifyContent: "flex-end",
  },
  menuButton: {
    position: "absolute",
    left: 24,
    width: 42,
    height: 42,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  headerText: {
    marginTop: 14,
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaLine: {
    width: 34,
    height: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    marginTop: 10,
    marginLeft: 2,
  },
  brand: {
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -1.1,
  },
  brandEmphasis: {
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 300,
  },
  headerBgIcon: {
    position: "absolute",
    right: -60,
    top: -24,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
});
