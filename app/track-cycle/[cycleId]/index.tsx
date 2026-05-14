import { Header } from '@/components/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HorizontalChartScrollView } from '@/components/ui/horizontal-chart-scroll-view';
import { DEFAULT_CHART_HEIGHT, DEFAULT_CHART_HORIZONTAL_INSET, DEFAULT_CHART_SCROLL_PADDING_RIGHT, DEFAULT_CHART_Y_AXIS_WIDTH } from '@/constants/charts';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { buildChartYAxis, buildYAxisBoundsDataset } from '@/services/chart-axis';
import {
  buildCycleChartLabels,
  calculateCycleChartWidth,
  calculateTouchDistance,
  getPinchAdjustedZoom,
} from '@/services/cycle-chart';
import { calculateCycleLevels } from '@/services/cycle-calculations';
import { Cycle, CycleCompound, deleteCycleCompound, getCycle, getCycleCompounds } from '@/services/database';

const screenWidth = Dimensions.get('window').width;
const chartFrameWidth = screenWidth - DEFAULT_CHART_HORIZONTAL_INSET;
const chartViewportWidth = chartFrameWidth - DEFAULT_CHART_Y_AXIS_WIDTH;

type PinchState = {
  startDistance: number;
  startZoom: number;
};

export default function CycleDetailScreen() {
  const { cycleId } = useLocalSearchParams();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [compounds, setCompounds] = useState<CycleCompound[]>([]);
  const [levelFactor, setLevelFactor] = useState(0.5);
  const [xZoom, setXZoom] = useState(1);
  const router = useRouter();
  const pinchStateRef = useRef<PinchState | null>(null);
  
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

  const chartSeries = useMemo(() => {
    if (!cycle || compounds.length === 0) return null;

    const series = calculateCycleLevels(
      compounds,
      new Date(cycle.start_date),
      new Date(cycle.end_date)
    );

    return series.length > 0 ? series : null;
  }, [cycle, compounds]);

  const chartDates = useMemo(() => {
    return chartSeries?.[0].data.map(point => point.date) ?? [];
  }, [chartSeries]);

  const chartData = useMemo(() => {
    if (!chartSeries) return null;

    const labels = buildCycleChartLabels(
      chartDates,
      xZoom,
    );

    const datasets = chartSeries.map(s => ({
      data: s.data.map(d => d.value * levelFactor),
      color: () => s.color,
      strokeWidth: 2,
      withDots: false,
    }));
    const axis = buildChartYAxis(
      datasets.flatMap(dataset => dataset.data),
      { includeZero: true },
    );

    return {
      axis,
      labels,
      datasets: [...datasets, buildYAxisBoundsDataset(axis, labels.length)],
    };
  }, [chartDates, chartSeries, levelFactor, xZoom]);

  const chartWidth = useMemo(() => {
    if (chartDates.length === 0) return chartViewportWidth;

    return calculateCycleChartWidth(
      chartDates,
      chartViewportWidth,
      xZoom,
    );
  }, [chartDates, xZoom]);

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

  const clearPinchState = useCallback(() => {
    pinchStateRef.current = null;
  }, []);

  const handleChartTouchStart = useCallback((event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    if (touches.length < 2) return;

    pinchStateRef.current = {
      startDistance: calculateTouchDistance(touches[0], touches[1]),
      startZoom: xZoom,
    };
  }, [xZoom]);

  const handleChartTouchMove = useCallback((event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    if (touches.length < 2) {
      clearPinchState();
      return;
    }

    const pinchState = pinchStateRef.current;
    const currentDistance = calculateTouchDistance(touches[0], touches[1]);

    if (!pinchState || pinchState.startDistance <= 0) {
      pinchStateRef.current = {
        startDistance: currentDistance,
        startZoom: xZoom,
      };
      return;
    }

    setXZoom(getPinchAdjustedZoom(
      pinchState.startZoom,
      currentDistance / pinchState.startDistance,
    ));
  }, [clearPinchState, xZoom]);

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
              <ThemedText style={[styles.zoomHint, { color: mutedColor }]}>Pinch the chart to zoom the timeline. Current: {xZoom.toFixed(2)}x</ThemedText>
              {!!chartSeries?.length && (
                <View style={styles.legendSection}>
                  <ThemedText style={[styles.legendLabel, { color: mutedColor }]}>Compounds</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendRow}>
                    {chartSeries.map(series => (
                      <View key={series.name} style={[styles.legendItem, { borderColor: withAlpha(primaryColor, 0.16) }]}>
                        <View style={[styles.legendSwatch, { backgroundColor: series.color }]} />
                        <ThemedText numberOfLines={1} style={styles.legendText}>{series.name}</ThemedText>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              <ThemedText style={[styles.yAxisLabel, { color: mutedColor }]}>ng/dL</ThemedText>
              <HorizontalChartScrollView
                viewportWidth={chartViewportWidth}
                contentWidth={chartWidth}
                yAxis={{ labels: chartData.axis.labels, color: textColor }}
                onTouchStart={handleChartTouchStart}
                onTouchMove={handleChartTouchMove}
                onTouchEnd={clearPinchState}
                onTouchCancel={clearPinchState}>
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={DEFAULT_CHART_HEIGHT}
                  chartConfig={{
                    backgroundColor: cardColor,
                    backgroundGradientFrom: cardColor,
                    backgroundGradientTo: cardColor,
                    decimalPlaces: chartData.axis.decimalPlaces,
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
                  fromNumber={chartData.axis.max}
                  fromZero={chartData.axis.min === 0}
                  segments={chartData.axis.segments}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                    paddingRight: DEFAULT_CHART_SCROLL_PADDING_RIGHT,
                  }}
                  withDots={false}
                  withHorizontalLabels={false}
                  withShadow={false}
                  withInnerLines={true}
                  withOuterLines={true}
                  withVerticalLines={false}
                />
              </HorizontalChartScrollView>
              <ThemedText style={[styles.axisLabel, { color: mutedColor }]}>Date (M/D)</ThemedText>
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
  zoomHint: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
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
  legendSection: {
    gap: 10,
    marginBottom: 4,
  },
  legendLabel: {
    fontSize: 12,
    opacity: 0.9,
  },
  legendRow: {
    gap: 10,
    paddingRight: 12,
  },
  legendItem: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 12,
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
