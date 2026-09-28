import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DashboardCard } from "@/components/DashboardCard";
import { Avatar, ProfileMenu } from "@/components/Header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SectionHeader } from "@/components/ui/section-header";
import { Fonts, getElevation, Radii, withAlpha } from "@/constants/theme";
import { useProfileMenuActions } from "@/hooks/use-profile-menu-actions";
import { useSyncRefresh } from "@/hooks/use-sync-refresh";
import { useTheme } from "@/hooks/use-theme";
import { getWeights, initDatabase } from "@/services/database";

interface WeightRecord {
  id: number;
  weight: number;
  date: string;
}

const getGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const formatDelta = (delta: number) => `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scheme, colors, accents } = useTheme();
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const {
    closeProfile,
    handleCheckUpdates,
    handleLogout,
    handleSync,
    isProfileOpen,
    openProfile,
    userEmail,
  } = useProfileMenuActions();

  const loadWeights = useCallback(async () => {
    await initDatabase();
    setWeights(await getWeights());
  }, []);

  useSyncRefresh(loadWeights);

  const now = new Date();
  const todayLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const weightSummary = useMemo(() => {
    if (weights.length === 0) return null;
    const sorted = [...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const [latest, previous] = sorted;
    return {
      latest,
      delta: previous ? latest.weight - previous.weight : null,
    };
  }, [weights]);

  const heroForeground = colors.onTint;
  const heroMuted = withAlpha(heroForeground, 0.72);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.greeting}>
            <ThemedText type="overline" tone="subtle">
              {todayLabel}
            </ThemedText>
            <ThemedText type="title">{getGreeting(now)}</ThemedText>
          </View>
          <Avatar email={userEmail} onPress={openProfile} size={44} />
        </View>

        <Pressable
          onPress={() => router.push("/track-weight")}
          accessibilityRole="button"
          accessibilityLabel="Open weight tracking"
          style={({ pressed }) => [
            styles.hero,
            { backgroundColor: colors.tint },
            getElevation(scheme, 3, colors.tint),
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            name="scale-bathroom"
            size={180}
            color={withAlpha(heroForeground, 0.08)}
            style={styles.heroDecoration}
          />
          <ThemedText type="overline" style={{ color: heroMuted }}>
            {weightSummary ? "Latest weigh-in" : "Get started"}
          </ThemedText>
          {weightSummary ? (
            <>
              <ThemedText style={[styles.heroValue, { color: heroForeground }]}>
                {weightSummary.latest.weight}
                <ThemedText style={[styles.heroUnit, { color: heroMuted }]}> kg</ThemedText>
              </ThemedText>
              <View style={styles.heroFooter}>
                {weightSummary.delta !== null && (
                  <View style={[styles.deltaPill, { backgroundColor: withAlpha(heroForeground, 0.16) }]}>
                    <MaterialCommunityIcons
                      name={weightSummary.delta > 0 ? "trending-up" : weightSummary.delta < 0 ? "trending-down" : "trending-neutral"}
                      size={16}
                      color={heroForeground}
                    />
                    <ThemedText type="caption" style={[styles.deltaText, { color: heroForeground }]}>
                      {formatDelta(weightSummary.delta)}
                    </ThemedText>
                  </View>
                )}
                <ThemedText type="caption" style={{ color: heroMuted }}>
                  {new Date(weightSummary.latest.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              <ThemedText style={[styles.heroEmptyTitle, { color: heroForeground }]}>
                Log your first weigh-in
              </ThemedText>
              <ThemedText type="caption" style={{ color: heroMuted }}>
                Your trend and progress will show up here.
              </ThemedText>
            </>
          )}
        </Pressable>

        <SectionHeader title="Track" caption="Pick up where you left off" style={styles.sectionHeader} />

        <View style={styles.grid}>
          <DashboardCard
            title="Weight"
            description="Weigh-ins and trends"
            icon="scale-bathroom"
            accent={accents.weight}
            onPress={() => router.push("/track-weight")}
          />
          <DashboardCard
            title="Lifts"
            description="Routines, sets and PRs"
            icon="dumbbell"
            accent={accents.lifts}
            onPress={() => router.push("/track-workouts")}
          />
          <DashboardCard
            title="Diet"
            description="Meals and macros"
            icon="food-apple"
            accent={accents.diet}
            onPress={() => router.push("/track-diet")}
          />
          <DashboardCard
            title="Cycle"
            description="Compounds and levels"
            icon="needle"
            accent={accents.cycle}
            onPress={() => router.push("/track-cycle")}
          />
        </View>
      </ScrollView>
      <ProfileMenu
        isOpen={isProfileOpen}
        onClose={closeProfile}
        email={userEmail}
        onLogout={handleLogout}
        onSync={handleSync}
        onCheckUpdates={handleCheckUpdates}
      />
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  greeting: {
    flex: 1,
    gap: 4,
  },
  hero: {
    borderRadius: Radii.sheet,
    padding: 20,
    gap: 6,
    overflow: "hidden",
    minHeight: 164,
    justifyContent: "flex-end",
  },
  heroDecoration: {
    position: "absolute",
    right: -36,
    top: -28,
  },
  heroValue: {
    fontFamily: Fonts?.display,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1.5,
  },
  heroUnit: {
    fontFamily: Fonts?.sansBold,
    fontSize: 20,
    letterSpacing: 0,
  },
  heroEmptyTitle: {
    fontFamily: Fonts?.display,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  deltaText: {
    fontFamily: Fonts?.sansBold,
  },
  sectionHeader: {
    marginTop: 28,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
