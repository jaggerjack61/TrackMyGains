import { Header } from '@/components/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { calculateCycleLevels } from '@/services/cycle-calculations';
import { Cycle, CycleCompound, deleteCycleCompound, getCycle, getCycleCompounds } from '@/services/database';

const screenWidth = Dimensions.get('window').width;

export default function CycleDetailScreen() {
  const { cycleId } = useLocalSearchParams();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [compounds, setCompounds] = useState<CycleCompound[]>([]);
  const [levelFactor, setLevelFactor] = useState(0.5);
  const router = useRouter();
  
  const primaryColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'tabIconDefault');
  const cardColor = useThemeColor({}, 'card');

  const loadData = useCallback(async () => {
    if (cycleId) {
      const cycleData = await getCycle(Number(cycleId));
      setCycle(cycleData);
      const compoundsData = await getCycleCompounds(Number(cycleId));
      setCompounds(compoundsData);
    }
  }, [cycleId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
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
      data: s.data.map(d => d.value * levelFactor),
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

  }, [cycle, compounds, levelFactor]);

  const compoundSections = useMemo(() => {
    const groupOrder: { type: CycleCompound['type']; title: string }[] = [
      { type: 'injectable', title: 'Injectables' },
      { type: 'oral', title: 'Orals' },
      { type: 'peptide', title: 'Peptides' },
    ];

    return groupOrder
      .map(group => ({
        title: group.title,
        data: compounds.filter(c => c.type === group.type),
      }))
      .filter(section => section.data.length > 0);
  }, [compounds]);

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
     !cycle ? null : <View>
        <View style={styles.dateContainer}>
           <ThemedText style={{ color: mutedColor, textAlign: 'center' }}>
             {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
           </ThemedText>
        </View>

        <View style={styles.sectionHeader}>
           {chartData && (
            <View style={[styles.chartContainer, { backgroundColor: cardColor }]}>
              <ThemedText type="subtitle" style={styles.chartTitle}>Estimated Blood Levels (ng/dL)</ThemedText>
              <View style={styles.factorRow}>
                <ThemedText style={[styles.factorLabel, { color: mutedColor }]}>
                  Level factor: {levelFactor.toFixed(2)}
                </ThemedText>
                <View style={styles.factorButtons}>
                  {[0.25, 0.5, 0.75, 1].map(f => {
                    const isActive = f === levelFactor;
                    return (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setLevelFactor(f)}
                        style={[
                          styles.factorButton,
                          { borderColor: primaryColor },
                          isActive && { backgroundColor: primaryColor },
                        ]}
                      >
                        <ThemedText style={[styles.factorButtonText, isActive && styles.factorButtonTextActive]}>
                          {f}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <ThemedText style={[styles.yAxisLabel, { color: mutedColor }]}>ng/dL</ThemedText>
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
                    color: (opacity = 1) => withAlpha(primaryColor, opacity),
                    labelColor: () => textColor,
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
              <ThemedText style={[styles.axisLabel, { color: mutedColor }]}>Date (D/M)</ThemedText>
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

      <SectionList
        sections={compoundSections}
        renderItem={renderCompound}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderSectionHeader={({ section }) => (
          <ThemedText type="subtitle" style={[styles.groupHeader, { color: mutedColor }]}>
            {section.title}
          </ThemedText>
        )}
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
  factorRow: {
    gap: 10,
    marginBottom: 8,
  },
  factorLabel: {
    fontSize: 12,
    opacity: 0.9,
    textAlign: 'center',
  },
  factorButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  factorButton: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  factorButtonText: {
    fontSize: 12,
  },
  factorButtonTextActive: {
    color: '#FFF',
  },
  yAxisLabel: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'left',
    alignSelf: 'flex-start',
    opacity: 0.9,
  },
  axisLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.9,
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
  groupHeader: {
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
    opacity: 0.9,
  },
});
