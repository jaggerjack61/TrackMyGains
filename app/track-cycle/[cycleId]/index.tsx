import { Header } from '@/components/Header';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
  type GestureResponderEvent,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { formatDateRange, getCycleProgress } from '@/components/cycle/cycle-progress';
import { CycleProgressBar, CycleStatusChip } from '@/components/cycle/cycle-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { buildLineChartConfig } from '@/components/ui/chart-theme';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { HorizontalChartScrollView } from '@/components/ui/horizontal-chart-scroll-view';
import { IconBadge } from '@/components/ui/icon-badge';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { DEFAULT_CHART_HEIGHT, DEFAULT_CHART_HORIZONTAL_INSET, DEFAULT_CHART_SCROLL_PADDING_RIGHT, DEFAULT_CHART_Y_AXIS_WIDTH } from '@/constants/charts';
import { Radii } from '@/constants/theme';
import { useSyncRefresh } from '@/hooks/use-sync-refresh';
import { useTheme } from '@/hooks/use-theme';
import { buildChartYAxis, buildYAxisBoundsDataset } from '@/services/chart-axis';
import {
  buildCycleChartLabels,
  calculateCycleChartWidth,
  calculateTouchDistance,
  getPinchAdjustedZoom,
} from '@/services/cycle-chart';
import { calculateCycleLevels } from '@/services/cycle-calculations';
import { Cycle, CycleCompound, deleteCycleCompound, getCycle, getCycleCompounds } from '@/services/database';

type PinchState = {
  startDistance: number;
  startZoom: number;
};

const LEVEL_FACTORS = [0.25, 0.5, 0.75, 1];

const COMPOUND_ICONS: Record<CycleCompound['type'], 'needle' | 'pill' | 'test-tube'> = {
  injectable: 'needle',
  oral: 'pill',
  peptide: 'test-tube',
};

const describeFrequency = (days: number) => {
  if (days === 1) return 'daily';
  if (days === 2) return 'every other day';
  if (days === 7) return 'weekly';
  return `every ${days} days`;
};

export default function CycleDetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const chartFrameWidth = screenWidth - DEFAULT_CHART_HORIZONTAL_INSET;
  const chartViewportWidth = chartFrameWidth - DEFAULT_CHART_Y_AXIS_WIDTH;
  const { cycleId } = useLocalSearchParams();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [compounds, setCompounds] = useState<CycleCompound[]>([]);
  const [levelFactor, setLevelFactor] = useState(0.5);
  const [xZoom, setXZoom] = useState(1);
  const router = useRouter();
  const pinchStateRef = useRef<PinchState | null>(null);

  const { colors, accents } = useTheme();
  const accent = accents.cycle;

  const loadData = useCallback(async () => {
    if (cycleId) {
      const cycleData = await getCycle(Number(cycleId));
      setCycle(cycleData);
      const compoundsData = await getCycleCompounds(Number(cycleId));
      setCompounds(compoundsData);
    }
  }, [cycleId]);

  useSyncRefresh(loadData);

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
  }, [chartDates, chartViewportWidth, xZoom]);

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

  const handleDeleteCompound = (compound: CycleCompound) => {
    Alert.alert('Remove compound', `Remove ${compound.name} from this cycle?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCycleCompound(compound.id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to remove compound: ' + (e.message || e));
          }
        },
      },
    ]);
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

  const addCompound = () => router.push(`/track-cycle/${cycleId}/add-compound`);

  const renderCompound = ({ item }: { item: CycleCompound }) => (
    <Card style={styles.compoundCard}>
      <IconBadge icon={COMPOUND_ICONS[item.type]} color={accent} />
      <View style={styles.compoundText}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>{item.name}</ThemedText>
        <ThemedText type="caption" tone="muted">
          {item.amount}{item.amount_unit} {describeFrequency(item.dosing_period)}
        </ThemedText>
        <ThemedText type="caption" tone="subtle">
          {formatDateRange(item.start_date, item.end_date)}
        </ThemedText>
      </View>
      <IconButton
        icon="trash-can-outline"
        color={colors.danger}
        size={36}
        onPress={() => handleDeleteCompound(item)}
        accessibilityLabel={`Remove ${item.name}`}
      />
    </Card>
  );

  const renderHeader = () => (
    !cycle ? null : <View style={styles.headerContent}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryDates}>
            <MaterialCommunityIcons name="calendar-range" size={18} color={colors.mutedText} />
            <ThemedText type="caption" tone="muted" style={styles.flex}>
              {formatDateRange(cycle.start_date, cycle.end_date)}
            </ThemedText>
          </View>
          <CycleStatusChip status={getCycleProgress(cycle.start_date, cycle.end_date).status} accent={accent} />
        </View>
        <CycleProgressBar startDate={cycle.start_date} endDate={cycle.end_date} accent={accent} />
      </Card>

      {chartData && (
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="heading">Estimated levels</ThemedText>
            <ThemedText type="caption" tone="muted">
              ng/dL · pinch to zoom ({xZoom.toFixed(2)}×)
            </ThemedText>
          </View>

          <View style={styles.factorBlock}>
            <ThemedText type="overline" tone="subtle">Level factor</ThemedText>
            <SegmentedControl
              size="sm"
              accent={accent}
              options={LEVEL_FACTORS.map(f => ({ value: f, label: `${f}` }))}
              value={levelFactor}
              onChange={setLevelFactor}
            />
          </View>

          {!!chartSeries?.length && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendRow}>
              {chartSeries.map(series => (
                <View key={series.name} style={[styles.legendItem, { backgroundColor: colors.cardMuted }]}>
                  <View style={[styles.legendSwatch, { backgroundColor: series.color }]} />
                  <ThemedText type="caption" numberOfLines={1}>{series.name}</ThemedText>
                </View>
              ))}
            </ScrollView>
          )}

          <HorizontalChartScrollView
            viewportWidth={chartViewportWidth}
            contentWidth={chartWidth}
            yAxis={{ labels: chartData.axis.labels, color: colors.subtleText }}
            onTouchStart={handleChartTouchStart}
            onTouchMove={handleChartTouchMove}
            onTouchEnd={clearPinchState}
            onTouchCancel={clearPinchState}>
            <LineChart
              data={chartData}
              width={chartWidth}
              height={DEFAULT_CHART_HEIGHT}
              chartConfig={buildLineChartConfig({ colors, color: accent, decimalPlaces: chartData.axis.decimalPlaces, dotRadius: 0 })}
              bezier
              fromNumber={chartData.axis.max}
              fromZero={chartData.axis.min === 0}
              segments={chartData.axis.segments}
              style={styles.chart}
              withDots={false}
              withHorizontalLabels={false}
              withShadow={false}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
            />
          </HorizontalChartScrollView>
        </Card>
      )}

      {compounds.length > 0 && (
        <SectionHeader
          title="Compounds"
          caption={`${compounds.length} in this cycle`}
          style={styles.compoundsHeader}
        />
      )}
    </View>
  );

  if (!cycle) {
    return (
      <ThemedView style={styles.container}>
        <Header eyebrow="Cycle" accent={accent} title="Cycle details" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={accent} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Header eyebrow="Cycle" accent={accent} title={cycle.name} showBack />

      <SectionList
        sections={compoundSections}
        renderItem={renderCompound}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <ThemedText type="overline" tone="subtle" style={styles.groupHeader}>
            {section.title}
          </ThemedText>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="flask-outline"
            accent={accent}
            title="No compounds yet"
            message="Add the compounds in this cycle to chart estimated blood levels."
            action={<Button label="Add compound" icon="plus" color={accent} onPress={addCompound} />}
          />
        }
      />

      {compounds.length > 0 && <Fab label="Add compound" color={accent} onPress={addCompound} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  headerContent: {
    gap: 12,
  },
  summaryCard: {
    gap: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryDates: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartCard: {
    paddingHorizontal: 12,
    gap: 14,
  },
  chartHeader: {
    gap: 2,
    paddingHorizontal: 4,
  },
  factorBlock: {
    gap: 8,
    paddingHorizontal: 4,
  },
  legendRow: {
    gap: 8,
    paddingHorizontal: 4,
  },
  legendItem: {
    alignItems: 'center',
    borderRadius: Radii.full,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chart: {
    paddingRight: DEFAULT_CHART_SCROLL_PADDING_RIGHT,
  },
  compoundsHeader: {
    marginTop: 16,
    marginBottom: 0,
  },
  groupHeader: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  compoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingVertical: 12,
    paddingRight: 8,
  },
  compoundText: {
    flex: 1,
    gap: 2,
  },
});
