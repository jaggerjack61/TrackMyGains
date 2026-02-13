import { Header } from '@/components/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { calculateCycleLevels } from '@/services/cycle-calculations';
import { Cycle, CycleCompound, deleteCycleCompound, getCycle, getCycleCompounds } from '@/services/database';

const screenWidth = Dimensions.get('window').width;

export default function CycleDetailScreen() {
  const { cycleId } = useLocalSearchParams();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [compounds, setCompounds] = useState<CycleCompound[]>([]);
  const router = useRouter();
  
  const primaryColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const mutedColor = useThemeColor({}, 'tabIconDefault');
  const cardColor = useThemeColor({}, 'card');

  const loadData = async () => {
    if (cycleId) {
      const cycleData = await getCycle(Number(cycleId));
      setCycle(cycleData);
      const compoundsData = await getCycleCompounds(Number(cycleId));
      setCompounds(compoundsData);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [cycleId])
  );

  const chartData = useMemo(() => {
    if (!cycle || compounds.length === 0) return null;

    const series = calculateCycleLevels(
      compounds,
      new Date(cycle.start_date),
      new Date(cycle.end_date)
    );

    if (series.length === 0) return null;

    // We need to sample labels to avoid overcrowding
    const dataPointsCount = series[0].data.length;
    const labelInterval = Math.max(1, Math.floor(dataPointsCount / 6)); // Show ~6 labels

    const labels = series[0].data
      .filter((_, i) => i % labelInterval === 0)
      .map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });

    const datasets = series.map(s => ({
      data: s.data.map(d => d.value),
      color: (opacity = 1) => s.color, // calculateCycleLevels returns rgba string, but chart kit expects function or specific color. 
      // calculateCycleLevels returns specific color string actually? No, it returns a string.
      // Wait, chart-kit dataset color property is optional, if provided it overrides base color.
      // But chart-kit documentation says `color: (opacity = 1) => string`.
      // My calculateCycleLevels returns a string like `rgba(..., 1)`.
      // So I should wrap it.
      strokeWidth: 2,
      withDots: false, // Hide dots for smoother look if many points
    }));
    
    // Legend
    const legend = series.map(s => s.name);

    return {
      labels,
      datasets,
      legend
    };

  }, [cycle, compounds]);

  const handleDeleteCompound = async (id: number) => {
    await deleteCycleCompound(id);
    loadData();
  };

  const renderCompound = ({ item }: { item: CycleCompound }) => (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <View style={styles.cardContent}>
        <ThemedText type="subtitle">{item.name}</ThemedText>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="needle" size={16} color={mutedColor} />
          <ThemedText style={styles.detailText}>
            {item.amount}{item.amount_unit} every {item.dosing_period} days
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar-range" size={16} color={mutedColor} />
          <ThemedText style={styles.detailText}>
            {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDeleteCompound(item.id)} hitSlop={10}>
        <MaterialCommunityIcons name="delete-outline" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
  
  const renderHeader = () => (
     <View>
        <View style={styles.dateContainer}>
           <ThemedText style={{ color: mutedColor, textAlign: 'center' }}>
             {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
           </ThemedText>
        </View>

        <View style={styles.sectionHeader}>
           {chartData && (
            <View style={[styles.chartContainer, { backgroundColor: cardColor }]}>
              <ThemedText type="subtitle" style={styles.chartTitle}>Estimated Blood Levels</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={chartData}
                  width={Math.max(screenWidth - 32, chartData.labels.length * 50)} // Scrollable if wide
                  height={220}
                  chartConfig={{
                    backgroundColor: cardColor,
                    backgroundGradientFrom: cardColor,
                    backgroundGradientTo: cardColor,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(109, 40, 217, ${opacity})`, // Default color
                    labelColor: (opacity = 1) => textColor,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: "0",
                    },
                    propsForBackgroundLines: {
                        strokeDasharray: "" // Solid lines
                    }
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                  withDots={false}
                  withShadow={false}
                  withInnerLines={true}
                  withOuterLines={true}
                  withVerticalLines={false}
                />
              </ScrollView>
            </View>
          )}
        </View>
        <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Compounds</ThemedText>
        </View>
    </View>
  );

  if (!cycle) {
    return (
      <ThemedView style={styles.container}>
        <Header title="Cycle Details" showBack />
        <View style={styles.center}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Header title={cycle.name} showBack />

      <FlatList
        data={compounds}
        renderItem={renderCompound}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText>No compounds added yet.</ThemedText>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={() => router.push(`/track-cycle/${cycleId}/add-compound`)}
      >
        <MaterialCommunityIcons name="plus" size={24} color="white" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100, // For FAB
  },
  dateContainer: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
});
