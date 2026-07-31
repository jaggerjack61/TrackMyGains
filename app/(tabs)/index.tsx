import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DashboardCard } from "@/components/DashboardCard";
import { ProfileMenu } from "@/components/Header";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { SoftButton } from "@/components/ui/soft-ui";
import { Colors, withAlpha } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useProfileMenuActions } from "@/hooks/use-profile-menu-actions";

export default function HomeScreen() {
  const mutedTextColor = useThemeColor({}, "mutedText");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    closeProfile,
    handleCheckUpdates,
    handleLogout,
    handleSync,
    isProfileOpen,
    openProfile,
    userEmail,
  } = useProfileMenuActions();

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
              name="dumbbell"
              size={96}
              color={tintColor}
              style={styles.headerIcon}
            />
            <View style={styles.headerText}>
              <ThemedText type="title" style={styles.brand}>
                Track My Gains
              </ThemedText>
              <ThemedText style={[styles.tagline, { color: mutedTextColor }]}>
                Log workouts, weight, diet, and cycles
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={220}
              color={withAlpha(tintColor, 0.12)}
              style={styles.headerBgIcon}
            />
          </View>
        }
      >
        <View style={styles.titleContainer}>
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
            title="Track Lifts"
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
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 12,
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
  headerIcon: {
    marginTop: 12,
    marginLeft: 8,
  },
  brand: {
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 20,
    maxWidth: 280,
  },
  headerBgIcon: {
    position: "absolute",
    right: -60,
    top: -40,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
});
