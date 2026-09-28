import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Constants from "expo-constants";
import React, { useCallback, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, MenuRow } from "@/components/Header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Fonts, Radii } from "@/constants/theme";
import { useProfileMenuActions } from "@/hooks/use-profile-menu-actions";
import { useSyncRefresh } from "@/hooks/use-sync-refresh";
import { useTheme } from "@/hooks/use-theme";
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
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [conflicts, setConflicts] = useState<SyncConflictRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const { handleCheckUpdates, handleLogout, handleSync, userEmail } = useProfileMenuActions();
  const appVersion = Constants.expoConfig?.version;

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

  const runSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await handleSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const runUpdateCheck = async () => {
    if (isCheckingUpdates) return;
    setIsCheckingUpdates(true);
    try {
      await handleCheckUpdates();
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <ThemedText type="overline" tone="subtle">Preferences</ThemedText>
          <ThemedText type="title">Settings</ThemedText>
        </View>

        <Card style={styles.profileCard}>
          <Avatar email={userEmail} size={52} />
          <View style={styles.profileText}>
            <ThemedText type="overline" tone="subtle">Signed in as</ThemedText>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {userEmail ?? "Unknown user"}
            </ThemedText>
          </View>
        </Card>

        <SectionHeader title="Account" style={styles.sectionHeader} />
        <Card padded={false} style={styles.group}>
          <MenuRow icon="cloud-sync-outline" label="Sync now" busyLabel="Syncing…" isBusy={isSyncing} onPress={runSync} />
          {Platform.OS === "android" && (
            <MenuRow
              icon="update"
              label="Check for updates"
              busyLabel="Checking…"
              isBusy={isCheckingUpdates}
              onPress={runUpdateCheck}
              showDivider
            />
          )}
          <MenuRow icon="logout" label="Log out" tone="danger" onPress={handleLogout} showDivider />
        </Card>

        <SectionHeader title="Data" caption="Back up or restore your data" style={styles.sectionHeader} />
        <Card padded={false} style={styles.group}>
          <MenuRow icon="tray-arrow-up" label="Export database" onPress={handleExport} />
          <MenuRow icon="tray-arrow-down" label="Import database" onPress={handleImport} showDivider />
        </Card>

        {conflicts.length > 0 && (
          <>
            <SectionHeader
              title="Sync conflicts"
              caption="Edits that lost a sync conflict are kept here instead of being discarded."
              style={styles.sectionHeader}
              trailing={
                <View style={[styles.badge, { backgroundColor: colors.dangerSoft }]}>
                  <ThemedText type="caption" style={[styles.badgeText, { color: colors.danger }]}>
                    {conflicts.length}
                  </ThemedText>
                </View>
              }
            />

            {conflicts.map((conflict) => (
              <Card key={`${conflict.collection_name}:${conflict.sync_id}`} style={styles.conflictCard}>
                <View style={styles.conflictHeader}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
                  <ThemedText type="defaultSemiBold" style={styles.conflictTitle}>
                    {COLLECTION_LABELS[conflict.collection_name] ?? conflict.collection_name}
                  </ThemedText>
                  <ThemedText type="caption" tone="subtle">
                    {formatConflictTime(conflict.lost_at)}
                  </ThemedText>
                </View>
                <View style={[styles.payload, { backgroundColor: colors.cardMuted }]}>
                  <ThemedText type="caption" numberOfLines={3}>
                    {summarizePayload(conflict.payload)}
                  </ThemedText>
                  <ThemedText type="caption" tone="subtle" numberOfLines={1} style={styles.syncId}>
                    {conflict.sync_id}
                  </ThemedText>
                </View>
                <View style={styles.conflictActions}>
                  <Button
                    label="Restore"
                    icon="restore"
                    variant="secondary"
                    size="sm"
                    style={styles.conflictButton}
                    onPress={() => handleRestoreConflict(conflict)}
                  />
                  <Button
                    label="Dismiss"
                    icon="close"
                    variant="danger"
                    size="sm"
                    style={styles.conflictButton}
                    onPress={() => handleDismissConflict(conflict)}
                  />
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <ThemedText type="caption" tone="subtle">
            Track My Gains{appVersion ? ` · v${appVersion}` : ""}
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  titleBlock: {
    gap: 4,
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileText: {
    flex: 1,
    gap: 4,
  },
  sectionHeader: {
    marginTop: 28,
  },
  group: {
    overflow: "hidden",
  },
  badge: {
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 2,
  },
  badgeText: {
    fontFamily: Fonts?.sansBold,
  },
  conflictCard: {
    gap: 12,
    marginBottom: 12,
  },
  conflictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conflictTitle: {
    flex: 1,
  },
  payload: {
    borderRadius: Radii.inner,
    padding: 12,
    gap: 6,
  },
  syncId: {
    fontFamily: Fonts?.mono,
    fontSize: 11,
  },
  conflictActions: {
    flexDirection: "row",
    gap: 10,
  },
  conflictButton: {
    flex: 1,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
});
