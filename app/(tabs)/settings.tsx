import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileMenu } from "@/components/Header";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SoftButton } from "@/components/ui/soft-ui";
import { Colors, withAlpha } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { exportDatabase, importDatabase } from "@/services/database";
import { bidirectionalSync, getFirebaseAuth } from "@/services/firebase";

export default function SettingsScreen() {
  const mutedTextColor = useThemeColor({}, "mutedText");
  const tintColor = useThemeColor({}, "tint");
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

  const handleExport = async () => {
    try {
      await exportDatabase();
    } catch (error: any) {
      Alert.alert("Export Failed", error.message);
    }
  };

  const handleImport = async () => {
    try {
      Alert.alert(
        "Confirm Import",
        "This will overwrite your current database with the selected file. This action cannot be undone. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            style: "destructive",
            onPress: async () => {
              try {
                await importDatabase();
                Alert.alert(
                  "Success",
                  "Database imported successfully. Please restart the app to ensure all data is loaded correctly.",
                );
              } catch (error: any) {
                Alert.alert("Import Failed", error.message);
              }
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
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
            <SoftButton
              onPress={() => setIsProfileOpen(true)}
              style={[
                styles.menuButton,
                {
                  top: Math.max(insets.top, 16),
                },
              ]}
              contentStyle={styles.menuButtonContent}
            >
              <MaterialCommunityIcons name="menu" size={22} color={tintColor} />
            </SoftButton>
            <MaterialCommunityIcons
              name="cog-outline"
              size={92}
              color={tintColor}
            />
            <View style={styles.headerText}>
              <ThemedText type="title">Settings</ThemedText>
              <ThemedText style={[styles.tagline, { color: mutedTextColor }]}>
                Manage your preferences
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="cog"
              size={240}
              color={withAlpha(tintColor, 0.12)}
              style={styles.headerBgIcon}
            />
          </View>
        }
      >
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Data Management</ThemedText>
        </ThemedView>
        <ThemedText style={[styles.intro, { color: mutedTextColor }]}>
          Backup or restore your data.
        </ThemedText>

        <View style={styles.buttonContainer}>
          <SoftButton style={styles.button} contentStyle={styles.buttonContent} onPress={handleExport}>
            <MaterialCommunityIcons
              name="export"
              size={24}
              color={tintColor}
              style={styles.buttonIcon}
            />
            <View>
              <ThemedText type="defaultSemiBold">Export Database</ThemedText>
              <ThemedText style={{ color: mutedTextColor, fontSize: 12 }}>
                Save your data to a file
              </ThemedText>
            </View>
          </SoftButton>

          <SoftButton
            style={[styles.button, { marginTop: 12 }]}
            contentStyle={styles.buttonContent}
            onPress={handleImport}
          >
            <MaterialCommunityIcons
              name="import"
              size={24}
              color={tintColor}
              style={styles.buttonIcon}
            />
            <View>
              <ThemedText type="defaultSemiBold">Import Database</ThemedText>
              <ThemedText style={{ color: mutedTextColor, fontSize: 12 }}>
                Restore data from a backup
              </ThemedText>
            </View>
          </SoftButton>
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
  titleContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  intro: {
    marginBottom: 20,
  },
  header: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
    justifyContent: "flex-end",
  },
  menuButton: {
    position: "absolute",
    left: 20,
    zIndex: 2,
  },
  menuButtonContent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: withAlpha(Colors.light.background, 0.92),
  },
  headerText: {
    marginTop: 12,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 20,
    maxWidth: 280,
  },
  headerBgIcon: {
    position: "absolute",
    right: -70,
    top: -60,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  buttonIcon: {
    marginRight: 16,
  },
});
