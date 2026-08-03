import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileMenu } from "@/components/Header";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SoftButton } from "@/components/ui/soft-ui";
import { Colors, withAlpha } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useProfileMenuActions } from "@/hooks/use-profile-menu-actions";
import { useSyncRefresh } from "@/hooks/use-sync-refresh";
import {
  deleteSyncConflict,
  exportDatabase,
  getSyncConflicts,
  importDatabase,
  restoreSyncConflict,
} from "@/services/database";
import type { SyncConflictRecord } from "@/services/sync-records";

const COLLECTION_LABELS: Record<string, string> = {
  weights: "Weights",
  routines: "Routines",
  workouts: "Workouts",
  exercises: "Exercises",
  exercise_logs: "Exercise Logs",
  diets: "Diets",
  daily_logs: "Daily Logs",
  meals: "Meals",
  cycles: "Cycles",
  cycle_compounds: "Cycle Compounds",
};

const formatConflictTime = (lostAt: string) => {
  const date = new Date(lostAt);
  return Number.isNaN(date.getTime())
    ? lostAt
    : date.toLocaleString();
};

const summarizePayload = (payload: string): string => {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const meaningful = Object.entries(parsed).filter(([key]) =>
      !["id", "sync_id", "created_at", "last_modified"].includes(key),
    );
    return meaningful.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
  } catch {
    return payload.slice(0, 120);
  }
};

export default function SettingsScreen() {
  const mutedTextColor = useThemeColor({}, "mutedText");
  const tintColor = useThemeColor({}, "tint");
  const insets = useSafeAreaInsets();
  const [conflicts, setConflicts] = useState<SyncConflictRecord[]>([]);
  const {
    closeProfile,
    handleCheckUpdates,
    handleLogout,
    handleSync,
    isProfileOpen,
    openProfile,
    userEmail,
  } = useProfileMenuActions();

  const loadConflicts = useCallback(async () => {
    const data = await getSyncConflicts();
    setConflicts(data);
  }, []);

  useSyncRefresh(loadConflicts);

  const handleRestoreConflict = (conflict: SyncConflictRecord) => {
    Alert.alert(
      "Restore this edit?",
      "Your version will replace the synced copy and be pushed on the next sync. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            const restored = await restoreSyncConflict(conflict);
            await loadConflicts();
            Alert.alert(
              restored ? "Restored" : "Could not restore",
              restored
                ? "Your edit will be synced on the next sync."
                : "This record could not be restored, likely because a parent record was deleted. You can dismiss it instead.",
            );
          },
        },
      ],
    );
  };

  const handleDismissConflict = (conflict: SyncConflictRecord) => {
    Alert.alert(
      "Discard this edit?",
      "The losing edit will be permanently removed. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            await deleteSyncConflict(conflict.collection_name, conflict.sync_id);
            await loadConflicts();
          },
        },
      ],
    );
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
              onPress={openProfile}
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

        {conflicts.length > 0 && (
          <>
            <ThemedView style={styles.titleContainer}>
              <ThemedText type="subtitle">Sync Conflicts</ThemedText>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>
                  {conflicts.length}
                </ThemedText>
              </View>
            </ThemedView>
            <ThemedText style={[styles.intro, { color: mutedTextColor }]}>
              Edits that lost a sync conflict were saved here instead of being
              discarded. Restore yours, or dismiss it.
            </ThemedText>

            {conflicts.map((conflict) => (
              <View key={`${conflict.collection_name}:${conflict.sync_id}`} style={styles.conflictCard}>
                <View style={styles.conflictHeader}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={20}
                    color="#EF4444"
                  />
                  <ThemedText type="defaultSemiBold">
                    {COLLECTION_LABELS[conflict.collection_name] ?? conflict.collection_name}
                  </ThemedText>
                  <ThemedText style={[styles.conflictTime, { color: mutedTextColor }]}>
                    {formatConflictTime(conflict.lost_at)}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.conflictId, { color: mutedTextColor }]} numberOfLines={1}>
                  {conflict.sync_id}
                </ThemedText>
                <ThemedText style={styles.conflictPreview} numberOfLines={2}>
                  {summarizePayload(conflict.payload)}
                </ThemedText>
                <View style={styles.conflictActions}>
                  <SoftButton
                    style={styles.conflictButton}
                    contentStyle={styles.conflictButtonContent}
                    onPress={() => handleRestoreConflict(conflict)}
                  >
                    <MaterialCommunityIcons
                      name="restore"
                      size={16}
                      color={tintColor}
                    />
                    <ThemedText type="defaultSemiBold" style={styles.conflictButtonText}>
                      Restore
                    </ThemedText>
                  </SoftButton>
                  <SoftButton
                    style={[styles.conflictButton, { marginLeft: 10 }]}
                    contentStyle={styles.conflictButtonContent}
                    onPress={() => handleDismissConflict(conflict)}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={16}
                      color="#EF4444"
                    />
                    <ThemedText type="defaultSemiBold" style={[styles.conflictButtonText, { color: "#EF4444" }]}>
                      Dismiss
                    </ThemedText>
                  </SoftButton>
                </View>
              </View>
            ))}
          </>
        )}
      </ParallaxScrollView>
      <ProfileMenu
        isOpen={isProfileOpen}
        onClose={closeProfile}
        email={userEmail}
        onLogout={handleLogout}
        onSync={handleSync}
        onCheckUpdates={handleCheckUpdates}
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
  badge: {
    backgroundColor: withAlpha("#EF4444", 0.15),
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  conflictCard: {
    backgroundColor: withAlpha("#EF4444", 0.06),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withAlpha("#EF4444", 0.2),
    padding: 14,
    marginBottom: 12,
  },
  conflictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conflictTime: {
    marginLeft: "auto",
    fontSize: 12,
  },
  conflictId: {
    fontSize: 12,
    marginTop: 6,
  },
  conflictPreview: {
    fontSize: 13,
    marginTop: 6,
  },
  conflictActions: {
    flexDirection: "row",
    marginTop: 12,
  },
  conflictButton: {
    flex: 1,
  },
  conflictButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  conflictButtonText: {
    fontSize: 13,
  },
});
