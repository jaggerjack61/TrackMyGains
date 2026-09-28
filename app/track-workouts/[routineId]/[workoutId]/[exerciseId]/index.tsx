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
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { Stat } from '@/components/ui/stat';
import { TextField } from '@/components/ui/text-field';
import { DEFAULT_CHART_HEIGHT, DEFAULT_CHART_HORIZONTAL_INSET, DEFAULT_CHART_SCROLL_PADDING_RIGHT, DEFAULT_CHART_Y_AXIS_WIDTH } from '@/constants/charts';
import { Fonts, Radii, withAlpha } from '@/constants/theme';
import { useSyncRefresh } from '@/hooks/use-sync-refresh';
import { useTheme } from '@/hooks/use-theme';
import { buildChartYAxis, buildYAxisBoundsDataset } from '@/services/chart-axis';
import { buildScrollableChartLabels, calculateScrollableChartWidth } from '@/services/chart-timeline';
import { addExerciseLog, deleteExerciseLog, ExerciseLog, getExerciseLogs, updateExerciseLog } from '@/services/database';
import { predictNextLog, PredictedLog } from '@/services/prediction';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

type GraphMetric = 'weight' | 'sets' | 'volume';

const LBS_PER_KG = 2.20462;
const toKg = (log: ExerciseLog) => (log.weight_unit === 'lbs' ? log.weight / LBS_PER_KG : log.weight);

export default function ExerciseDetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const chartFrameWidth = screenWidth - DEFAULT_CHART_HORIZONTAL_INSET;
  const chartViewportWidth = chartFrameWidth - DEFAULT_CHART_Y_AXIS_WIDTH;
  const { exerciseId, exerciseName } = useLocalSearchParams<{ exerciseId: string; exerciseName: string }>();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [editingLog, setEditingLog] = useState<ExerciseLog | null>(null);
  const [date, setDate] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('');
  const [predicted, setPredicted] = useState<{ weight?: boolean; sets?: boolean; reps?: boolean }>({});
  const [prediction, setPrediction] = useState<PredictedLog | null>(null);

  // Graph State
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('weight');

  const { colors, accents } = useTheme();
  const accent = accents.lifts;

  const loadData = useCallback(async () => {
    if (!exerciseId) return;
    const data = await getExerciseLogs(Number(exerciseId));
    setLogs(data);
    setPrediction(predictNextLog(data));
  }, [exerciseId]);

  useSyncRefresh(loadData);

  const handleSaveLog = async () => {
    if (!weight || !reps || !sets) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const weightVal = parseFloat(weight);
    const repsVal = parseInt(reps, 10);
    const setsVal = parseInt(sets, 10);

    if (isNaN(weightVal) || isNaN(repsVal) || isNaN(setsVal)) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    try {
      if (editingLog) {
        await updateExerciseLog(
          editingLog.id,
          date.toISOString(),
          weightVal,
          weightUnit,
          repsVal,
          setsVal
        );
      } else {
        await addExerciseLog(
          Number(exerciseId),
          date.toISOString(),
          weightVal,
          weightUnit,
          repsVal,
          setsVal
        );
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save log: ' + (e.message || e));
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExerciseLog(id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete log: ' + (e.message || e));
          }
        },
      },
    ]);
  };

  const handleEdit = (log: ExerciseLog) => {
    setEditingLog(log);
    setDate(new Date(log.date));
    setWeight(log.weight.toString());
    setWeightUnit(log.weight_unit);
    setReps(log.reps.toString());
    setSets(log.sets.toString());
    setPredicted({});
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingLog(null);
    setDate(new Date());
    if (prediction) {
      setWeight(prediction.weight);
      setWeightUnit(prediction.unit);
      setSets(prediction.sets);
      setReps(prediction.reps);
      setPredicted({ weight: true, sets: true, reps: true });
    } else {
      setWeight('');
      setSets('');
      setReps('');
      setPredicted({});
    }
  };

  const clearIfPredicted = (field: 'weight' | 'sets' | 'reps') => {
    if (!predicted[field]) return;
    if (field === 'weight') setWeight('');
    else if (field === 'sets') setSets('');
    else setReps('');
    setPredicted((p) => ({ ...p, [field]: false }));
  };

  const handleWeightUnitChange = (unit: 'kg' | 'lbs') => {
    setWeightUnit(unit);
    if (predicted.weight && weight !== '') {
      const val = parseFloat(weight);
      if (!isNaN(val)) {
        const converted = unit === 'kg' ? val / 2.20462 : val * 2.20462;
        setWeight((Math.round(converted * 10) / 10).toString());
      }
    }
  };

  const graphData = useMemo(() => {
    if (logs.length === 0) return null;
    
    // Sort by date ascending for graph
    const sortedLogs = [...logs]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sortedLogs.length === 0) return null;

    const chartDates = sortedLogs.map(l => l.date);
    const labels = buildScrollableChartLabels(chartDates);

    const data = sortedLogs.map(l => {
      switch (graphMetric) {
        case 'sets': return l.sets;
        case 'volume': return l.weight * l.reps * l.sets;
        case 'weight': default: return l.weight;
      }
    });
    const axis = buildChartYAxis(data, { includeZero: graphMetric !== 'weight' });

    return {
      axis,
      chartWidth: calculateScrollableChartWidth(chartDates, chartViewportWidth),
      labels,
      datasets: [{ data }, buildYAxisBoundsDataset(axis, labels.length)],
    };
  }, [chartViewportWidth, graphMetric, logs]);

  const summary = useMemo(() => {
    if (logs.length === 0) return null;
    const best = logs.reduce((top, log) => (toKg(log) > toKg(top) ? log : top));
    const latest = logs.reduce((newest, log) => (new Date(log.date) > new Date(newest.date) ? log : newest));
    return { best, latest, sessions: logs.length };
  }, [logs]);

  const hasPrediction = Boolean(predicted.weight || predicted.sets || predicted.reps);

  const openNewLog = () => {
    resetForm();
    setModalVisible(true);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header eyebrow="Exercise" accent={accent} title={exerciseName || 'Exercise Details'} />

      <FlatList
        ListHeaderComponent={
          summary ? (
            <View style={styles.headerContent}>
              <Card style={styles.summaryCard}>
                <Stat label="Best" value={summary.best.weight} unit={summary.best.weight_unit} style={styles.flex} />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Stat
                  label="Last"
                  value={`${summary.latest.weight}`}
                  unit={`${summary.latest.weight_unit} × ${summary.latest.reps}`}
                  style={styles.flex}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Stat label="Sessions" value={summary.sessions} style={styles.flex} />
              </Card>

              <Card style={styles.chartCard}>
                <SegmentedControl
                  size="sm"
                  accent={accent}
                  options={[
                    { value: 'weight', label: 'Weight' },
                    { value: 'sets', label: 'Sets' },
                    { value: 'volume', label: 'Volume' },
                  ]}
                  value={graphMetric}
                  onChange={setGraphMetric}
                />
                {graphData && (
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
                    />
                  </HorizontalChartScrollView>
                )}
              </Card>

              <SectionHeader title="History" caption="Tap a session to edit it" style={styles.historyHeader} />
            </View>
          ) : null
        }
        data={logs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const logDate = new Date(item.date);
          return (
            <Card style={styles.logItem} onPress={() => handleEdit(item)} accessibilityLabel={`Edit log from ${logDate.toLocaleDateString()}`}>
              <View style={[styles.dateBadge, { backgroundColor: withAlpha(accent, 0.12) }]}>
                <ThemedText style={[styles.dateDay, { color: accent }]}>{logDate.getDate()}</ThemedText>
                <ThemedText type="overline" style={{ color: accent }}>
                  {logDate.toLocaleDateString(undefined, { month: 'short' })}
                </ThemedText>
              </View>
              <View style={styles.logMain}>
                <ThemedText type="heading">
                  {item.weight} {item.weight_unit}
                </ThemedText>
                <ThemedText type="caption" tone="muted">
                  {item.sets} sets × {item.reps} reps · {(item.weight * item.sets * item.reps).toFixed(0)} vol
                </ThemedText>
              </View>
              <IconButton
                icon="trash-can-outline"
                color={colors.danger}
                size={36}
                onPress={() => handleDelete(item.id)}
                accessibilityLabel="Delete log"
              />
            </Card>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="chart-line"
            accent={accent}
            title="No sessions logged"
            message="Log your first set to start tracking strength over time."
            action={<Button label="Log session" icon="plus" color={accent} onPress={openNewLog} />}
          />
        }
      />

      {logs.length > 0 && <Fab label="Log session" color={accent} onPress={openNewLog} />}

      <Sheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingLog ? 'Edit session' : 'Log session'}
        subtitle={exerciseName}
        footer={
          <>
            <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setModalVisible(false)} />
            <Button label="Save" color={accent} style={styles.flex} onPress={handleSaveLog} />
          </>
        }>
        {hasPrediction && (
          <View style={[styles.predictionBanner, { backgroundColor: withAlpha(accent, 0.12) }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color={accent} />
            <ThemedText type="caption" style={[styles.predictionText, { color: accent }]}>
              Suggested from your recent sessions. Tap a field to change it.
            </ThemedText>
          </View>
        )}

        <DateField label="Date" value={date} onChange={setDate} />

        <View style={styles.formRow}>
          <TextField
            label="Weight"
            containerStyle={styles.flex}
            dimmed={predicted.weight}
            onChangeText={setWeight}
            onFocus={() => clearIfPredicted('weight')}
            value={weight}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <View style={styles.unitColumn}>
            <ThemedText type="caption" tone="muted" style={styles.unitLabel}>Unit</ThemedText>
            <SegmentedControl
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lbs', label: 'lbs' },
              ]}
              value={weightUnit}
              onChange={handleWeightUnitChange}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <TextField
            label="Sets"
            containerStyle={styles.flex}
            dimmed={predicted.sets}
            onChangeText={setSets}
            onFocus={() => clearIfPredicted('sets')}
            value={sets}
            keyboardType="number-pad"
            placeholder="0"
          />
          <TextField
            label="Reps"
            containerStyle={styles.flex}
            dimmed={predicted.reps}
            onChangeText={setReps}
            onFocus={() => clearIfPredicted('reps')}
            value={reps}
            keyboardType="number-pad"
            placeholder="0"
          />
        </View>
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
    gap: 12,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  chartCard: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chart: {
    marginTop: 8,
    paddingRight: DEFAULT_CHART_SCROLL_PADDING_RIGHT,
  },
  historyHeader: {
    marginTop: 16,
    marginBottom: 4,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    paddingVertical: 12,
    paddingRight: 8,
  },
  dateBadge: {
    width: 52,
    height: 52,
    borderRadius: Radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontFamily: Fonts?.displayBold,
    fontSize: 18,
    lineHeight: 22,
  },
  logMain: {
    flex: 1,
    gap: 2,
  },
  predictionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radii.inner,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  predictionText: {
    flex: 1,
    fontFamily: Fonts?.sansMedium,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  unitColumn: {
    width: 124,
    gap: 6,
  },
  unitLabel: {
    fontFamily: Fonts?.sansMedium,
  },
});
