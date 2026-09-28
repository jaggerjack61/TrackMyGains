import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { buildLineChartConfig } from '@/components/ui/chart-theme';
import { DateField } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { HorizontalChartScrollView } from '@/components/ui/horizontal-chart-scroll-view';
import { SectionHeader } from '@/components/ui/section-header';
import { Sheet } from '@/components/ui/sheet';
import { Stat } from '@/components/ui/stat';
import { TextField } from '@/components/ui/text-field';
import { DEFAULT_CHART_HEIGHT, DEFAULT_CHART_HORIZONTAL_INSET, DEFAULT_CHART_SCROLL_PADDING_RIGHT, DEFAULT_CHART_Y_AXIS_WIDTH } from '@/constants/charts';
import { Fonts, Radii, withAlpha } from '@/constants/theme';
import { useSyncRefresh } from '@/hooks/use-sync-refresh';
import { useTheme } from '@/hooks/use-theme';
import { buildChartYAxis, buildYAxisBoundsDataset } from '@/services/chart-axis';
import { buildScrollableChartLabels, calculateScrollableChartWidth } from '@/services/chart-timeline';
import { addWeight, deleteWeight, getWeights, initDatabase } from '@/services/database';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface WeightRecord {
  id: number;
  weight: number;
  date: string;
}

const formatDelta = (delta: number) => `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;

export default function TrackWeightScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const chartFrameWidth = screenWidth - DEFAULT_CHART_HORIZONTAL_INSET;
  const chartViewportWidth = chartFrameWidth - DEFAULT_CHART_Y_AXIS_WIDTH;
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(new Date());

  const { colors, accents } = useTheme();
  const accent = accents.weight;

  const loadData = useCallback(async () => {
    await initDatabase();
    const data = await getWeights();
    setWeights(data);
  }, []);

  useSyncRefresh(loadData);

  const handleAddWeight = async () => {
    if (!newWeight) {
      Alert.alert('Error', 'Please enter a weight');
      return;
    }
    const weightVal = parseFloat(newWeight);
    if (isNaN(weightVal)) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }

    try {
      await addWeight(weightVal, newDate.toISOString());
      setModalVisible(false);
      setNewWeight('');
      setNewDate(new Date());
      loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save weight: ' + (e.message || e));
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWeight(id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete weight: ' + (e.message || e));
          }
        },
      },
    ]);
  };

  const sortedWeights = useMemo(() => {
    return [...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [weights]);

  const chronologicalWeights = useMemo(() => {
    return [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weights]);

  const graphData = useMemo(() => {
    if (chronologicalWeights.length === 0) return null;

    const chartDates = chronologicalWeights.map(w => w.date);
    const labels = buildScrollableChartLabels(chartDates);

    const data = chronologicalWeights.map(w => w.weight);
    const axis = buildChartYAxis(data);
    const visibleDatasets = [
      {
        data,
        color: (opacity = 1) => withAlpha(accent, opacity),
        strokeWidth: 2.5,
      },
    ];

    return {
      axis,
      chartWidth: calculateScrollableChartWidth(chartDates, chartViewportWidth),
      labels,
      datasets: [...visibleDatasets, buildYAxisBoundsDataset(axis, labels.length)],
      legend: ['Weight']
    };
  }, [accent, chartViewportWidth, chronologicalWeights]);

  const summary = useMemo(() => {
    if (chronologicalWeights.length === 0) return null;
    const first = chronologicalWeights[0];
    const latest = chronologicalWeights[chronologicalWeights.length - 1];
    return {
      latest,
      change: latest.weight - first.weight,
      entries: chronologicalWeights.length,
    };
  }, [chronologicalWeights]);

  const openAddWeight = () => {
    setNewWeight('');
    setNewDate(new Date());
    setModalVisible(true);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header eyebrow="Weight" accent={accent} title="Body weight" />

      <FlatList
        data={sortedWeights}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          summary && graphData ? (
            <View style={styles.headerContent}>
              <Card style={styles.summaryCard}>
                <Stat label="Current" value={summary.latest.weight} unit="kg" size="lg" style={styles.summaryMain} />
                <View style={styles.summarySide}>
                  <Stat label="Change" value={formatDelta(summary.change)} unit="kg" size="sm" />
                  <Stat label="Entries" value={summary.entries} size="sm" />
                </View>
              </Card>

              <Card style={styles.chartCard}>
                <HorizontalChartScrollView
                  viewportWidth={chartViewportWidth}
                  contentWidth={graphData.chartWidth}
                  yAxis={{ labels: graphData.axis.labels, color: colors.subtleText }}
                >
                  <LineChart
                    data={{
                      labels: graphData.labels,
                      datasets: graphData.datasets
                    }}
                    width={graphData.chartWidth}
                    height={DEFAULT_CHART_HEIGHT}
                    chartConfig={buildLineChartConfig({ colors, color: accent, decimalPlaces: graphData.axis.decimalPlaces })}
                    bezier
                    fromNumber={graphData.axis.max}
                    fromZero={graphData.axis.min === 0}
                    segments={graphData.axis.segments}
                    style={styles.chart}
                    withHorizontalLabels={false}
                    withVerticalLines={false}
                    withOuterLines={false}
                    hidePointsAtIndex={graphData.labels.length > 10 ? Array.from({ length: graphData.labels.length }, (_, i) => i).filter(i => i % 5 !== 0) : []}
                  />
                </HorizontalChartScrollView>
              </Card>

              <SectionHeader title="History" style={styles.historyHeader} />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const previous = sortedWeights[index + 1];
          const delta = previous ? item.weight - previous.weight : null;
          const itemDate = new Date(item.date);
          return (
            <Card style={styles.listItem}>
              <View style={styles.itemMain}>
                <ThemedText type="heading">
                  {item.weight}
                  <ThemedText type="caption" tone="muted"> kg</ThemedText>
                </ThemedText>
                <ThemedText type="caption" tone="muted">
                  {itemDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </ThemedText>
              </View>
              {delta !== null && (
                <View style={[styles.deltaChip, { backgroundColor: colors.cardMuted }]}>
                  <MaterialCommunityIcons
                    name={delta > 0 ? 'arrow-up' : delta < 0 ? 'arrow-down' : 'minus'}
                    size={14}
                    color={colors.mutedText}
                  />
                  <ThemedText type="caption" tone="muted" style={styles.deltaText}>
                    {Math.abs(delta).toFixed(1)}
                  </ThemedText>
                </View>
              )}
              <IconButton
                icon="trash-can-outline"
                color={colors.danger}
                size={36}
                onPress={() => handleDelete(item.id)}
                accessibilityLabel="Delete weigh-in"
              />
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="scale-bathroom"
            accent={accent}
            title="No weigh-ins yet"
            message="Log your weight regularly to see your trend over time."
            action={<Button label="Log weight" icon="plus" color={accent} onPress={openAddWeight} />}
          />
        }
        contentContainerStyle={styles.listContent}
      />

      {weights.length > 0 && <Fab label="Log weight" color={accent} onPress={openAddWeight} />}

      <Sheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Log weight"
        footer={
          <>
            <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setModalVisible(false)} />
            <Button label="Save" color={accent} style={styles.flex} onPress={handleAddWeight} />
          </>
        }>
        <DateField label="Date" value={newDate} onChange={setNewDate} />
        <TextField
          label="Weight"
          suffix="kg"
          onChangeText={setNewWeight}
          value={newWeight}
          keyboardType="decimal-pad"
          placeholder="0.0"
          autoFocus
        />
      </Sheet>
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  headerContent: {
    gap: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryMain: {
    flex: 1,
  },
  summarySide: {
    gap: 10,
    minWidth: 96,
  },
  chartCard: {
    paddingHorizontal: 12,
  },
  chart: {
    paddingRight: DEFAULT_CHART_SCROLL_PADDING_RIGHT,
  },
  historyHeader: {
    marginTop: 16,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingVertical: 12,
    paddingRight: 8,
  },
  itemMain: {
    flex: 1,
    gap: 2,
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  deltaText: {
    fontFamily: Fonts?.sansBold,
  },
});
