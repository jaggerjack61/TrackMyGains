import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DashboardCard } from '@/components/DashboardCard';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function HomeScreen() {
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const router = useRouter();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#6D28D9', dark: '#0F172A' }}
      headerImage={
        <View style={styles.header}>
          <MaterialCommunityIcons name="dumbbell" size={96} color="rgba(255,255,255,0.92)" />
          <View style={styles.headerText}>
            <ThemedText type="title" lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.brand}>
              Track My Gains
            </ThemedText>
            <ThemedText
              lightColor="rgba(255,255,255,0.82)"
              darkColor="rgba(255,255,255,0.82)"
              style={styles.tagline}>
              Log workouts, weight, diet, and cycles
            </ThemedText>
          </View>
          <MaterialCommunityIcons
            name="lightning-bolt"
            size={220}
            color="rgba(255,255,255,0.10)"
            style={styles.headerBgIcon}
          />
        </View>
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome back</ThemedText>
      </ThemedView>
      <ThemedText style={[styles.subtitle, { color: mutedTextColor }]}>
        What would you like to track today?
      </ThemedText>
      
      <ThemedView style={styles.gridContainer}>
        <DashboardCard 
          title="Track Weight" 
          icon="scale-bathroom" 
          onPress={() => router.push('/track-weight')}
        />
        <DashboardCard 
          title="Track Workouts" 
          icon="dumbbell" 
          onPress={() => router.push('/track-workouts')}
        />
        <DashboardCard 
          title="Track Diet" 
          icon="food-apple" 
          onPress={() => router.push('/track-diet')}
        />
        <DashboardCard 
          title="Track Cycle" 
          icon="needle" 
          onPress={() => router.push('/track-cycle')}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'flex-end',
  },
  headerText: {
    marginTop: 12,
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
    position: 'absolute',
    right: -60,
    top: -40,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
});
