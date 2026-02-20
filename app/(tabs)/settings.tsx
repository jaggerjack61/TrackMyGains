import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileMenu } from "@/components/Header";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Fonts, withAlpha } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { exportDatabase, importDatabase } from "@/services/database";
import { bidirectionalSync, getFirebaseAuth } from "@/services/firebase";

export default function SettingsScreen() {
  const mutedTextColor = useThemeColor({}, "mutedText");
  const tintColor = useThemeColor({}, "tint");
  const cardColor = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
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
              name="cog-outline"
              size={80}
              color={tintColor}
            />
            <View style={styles.headerText}>
              <View style={styles.metaRow}>
                <View style={[styles.metaLine, { backgroundColor: textColor }]} />
                <ThemedText type="label" style={{ color: mutedTextColor }}>
                  Operations / Vol. 01
                </ThemedText>
              </View>
              <ThemedText type="title" style={styles.settingsTitle}>
                System
                <ThemedText
                  type="title"
                  style={[styles.settingsTitleItalic, { color: tintColor, fontFamily: Fonts?.serifItalic ?? Fonts?.serif }]}
                >
                  {" "}
                  Settings
                </ThemedText>
              </ThemedText>
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
          <ThemedText type="label" style={{ color: mutedTextColor }}>
            Data
          </ThemedText>
          <ThemedText type="subtitle">Management</ThemedText>
        </ThemedView>
        <ThemedText style={[styles.intro, { color: mutedTextColor }]}>
          Backup or restore your data.
        </ThemedText>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: cardColor, borderColor }]}
            onPress={handleExport}
          >
            <MaterialCommunityIcons
              name="export"
              size={24}
              color={tintColor}
              style={styles.buttonIcon}
            />
            <View>
              <ThemedText type="defaultSemiBold">Export Database</ThemedText>
              <ThemedText type="label" style={{ color: mutedTextColor, fontSize: 10, lineHeight: 14 }}>
                Save your data to a file
              </ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: cardColor, borderColor }]}
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
              <ThemedText type="label" style={{ color: mutedTextColor, fontSize: 10, lineHeight: 14 }}>
                Restore data from a backup
              </ThemedText>
            </View>
          </TouchableOpacity>
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
    gap: 10,
    marginTop: 2,
  },
  intro: {
    marginBottom: 22,
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
  settingsTitle: {
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -0.9,
  },
  settingsTitleItalic: {
    letterSpacing: -0.9,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 300,
  },
  headerBgIcon: {
    position: "absolute",
    right: -68,
    top: -34,
  },
  buttonContainer: {
    marginTop: 8,
    gap: 14,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  buttonIcon: {
    marginRight: 16,
  },
});
