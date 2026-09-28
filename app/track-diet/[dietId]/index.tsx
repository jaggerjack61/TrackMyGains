import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { buildLineChartConfig } from '@/components/ui/chart-theme';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { HorizontalChartScrollView } from '@/components/ui/horizontal-chart-scroll-view';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { DEFAULT_CHART_HEIGHT, DEFAULT_CHART_HORIZONTAL_INSET, DEFAULT_CHART_SCROLL_PADDING_RIGHT, DEFAULT_CHART_Y_AXIS_WIDTH } from '@/constants/charts';
import { Fonts, Radii, withAlpha } from '@/constants/theme';
import { useSyncRefresh } from '@/hooks/use-sync-refresh';
import { useTheme } from '@/hooks/use-theme';
import { buildChartYAxis, buildYAxisBoundsDataset } from '@/services/chart-axis';
import { buildScrollableChartLabels, calculateScrollableChartWidth } from '@/services/chart-timeline';
import { addDailyLog, DailyLogWithStats, deleteDailyLog, getDailyLogsWithStats } from '@/services/database';
import { formatLocalDateKey, parseLocalDateKey } from '@/services/date-utils';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

type GraphMetric = 'calories' | 'protein' | 'carbs' | 'fats';

export default function DietDetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const chartFrameWidth = screenWidth - DEFAULT_CHART_HORIZONTAL_INSET;
  const chartViewportWidth = chartFrameWidth - DEFAULT_CHART_Y_AXIS_WIDTH;
  const { dietId } = useLocalSearchParams<{ dietId: string }>();
  const [dailyLogs, setDailyLogs] = useState<(DailyLogWithStats & { totalStats: { calories: number; protein: number; carbs: number; fats: number } })[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('calories');
  const router = useRouter();

  const { scheme, colors, accents, macros } = useTheme();
  const accent = accents.diet;
  const metricColors: Record<GraphMetric, string> = {
    calories: accent,
    protein: macros.protein,
    carbs: macros.carbs,
    fats: macros.fats,
  };

  const loadData = useCallback(async () => {
    if (!dietId) return;
    const logs = await getDailyLogsWithStats(Number(dietId));
    const logsWithStats = logs.map(log => ({
      ...log,
      totalStats: {
        calories: log.total_calories,
        protein: log.total_protein,
        carbs: log.total_carbs,
        fats: log.total_fats,
      },
    }));

    setDailyLogs(logsWithStats);
  }, [dietId]);

  useSyncRefresh(loadData);

  const handleAddDay = () => {
    setShowDatePicker(true);
  };

  const saveSelectedDay = async (selectedDate: Date) => {
    if (isAddingDay) return;
    const dateKey = formatLocalDateKey(selectedDate);
    const existing = dailyLogs.find(log => log.date === dateKey);
    if (existing) {
      Alert.alert('Info', 'A log for this date already exists', [
        { text: 'Go to Log', onPress: () => router.push(`/track-diet/${dietId}/${existing.date}`) },
      ]);
      return;
    }

    setIsAddingDay(true);
    try {
      await addDailyLog(Number(dietId), dateKey);
      await loadData();
      router.push(`/track-diet/${dietId}/${dateKey}`);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add day: ' + (error.message || error));
    } finally {
      setIsAddingDay(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (event?.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    const currentDate = selectedDate || date;
    setDate(currentDate);
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) void saveSelectedDay(selectedDate);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this day?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDailyLog(id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete day: ' + (e.message || e));
          }
        },
      },
    ]);
  };

  const graphData = useMemo(() => {
    if (dailyLogs.length === 0) return null;

    const sortedLogs = [...dailyLogs]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const chartDates = sortedLogs.map(l => l.date);
    const labels = buildScrollableChartLabels(chartDates);

    const data = sortedLogs.map(l => l.totalStats[graphMetric]);
    const axis = buildChartYAxis(data, { includeZero: true });

    return {
      axis,
      chartWidth: calculateScrollableChartWidth(chartDates, chartViewportWidth),
      labels,
      datasets: [{ data }, buildYAxisBoundsDataset(axis, labels.length)],
    };
  }, [chartViewportWidth, dailyLogs, graphMetric]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header eyebrow="Diet" accent={accent} title="Diet history" />

      <FlatList
        ListHeaderComponent={
          graphData ? (
            <View style={styles.headerContent}>
              <Card style={styles.chartCard}>
                <SegmentedControl
                  size="sm"
                  accent={metricColors[graphMetric]}
                  options={[
                    { value: 'calories', label: 'Calories' },
                    { value: 'protein', label: 'Protein' },
                    { value: 'carbs', label: 'Carbs' },
                    { value: 'fats', label: 'Fats' },
                  ]}
                  value={graphMetric}
                  onChange={setGraphMetric}
                />
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
                    chartConfig={buildLineChartConfig({
                      colors,
                      color: metricColors[graphMetric],
                      decimalPlaces: graphData.axis.decimalPlaces,
                    })}
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
              </Card>

              <SectionHeader title="Daily logs" caption={`${dailyLogs.length} ${dailyLogs.length === 1 ? 'day' : 'days'} tracked`} style={styles.listHeader} />
            </View>
          ) : null
        }
        data={dailyLogs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const logDate = parseLocalDateKey(item.date);
          return (
            <Card
              style={styles.listItem}
              onPress={() => router.push(`/track-diet/${dietId}/${item.date}`)}
              accessibilityLabel={`Open log for ${logDate.toLocaleDateString()}`}>
              <View style={[styles.dateBadge, { backgroundColor: withAlpha(accent, scheme === 'dark' ? 0.18 : 0.12) }]}>
                <ThemedText type="overline" style={{ color: accent }}>
                  {logDate.toLocaleDateString(undefined, { weekday: 'short' })}
                </ThemedText>
                <ThemedText style={[styles.dateDay, { color: accent }]}>{logDate.getDate()}</ThemedText>
              </View>
              <View style={styles.itemMain}>
                <ThemedText type="heading">
                  {item.totalStats.calories}
                  <ThemedText type="caption" tone="muted"> kcal</ThemedText>
                </ThemedText>
                <View style={styles.macroRow}>
                  <MacroText color={macros.protein} label="P" value={item.totalStats.protein} />
                  <MacroText color={macros.carbs} label="C" value={item.totalStats.carbs} />
                  <MacroText color={macros.fats} label="F" value={item.totalStats.fats} />
                </View>
              </View>
              <IconButton
                icon="trash-can-outline"
                color={colors.danger}
                size={36}
                onPress={() => handleDelete(item.id)}
                accessibilityLabel="Delete day"
              />
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.subtleText} />
            </Card>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-plus"
            accent={accent}
            title="No days tracked yet"
            message="Add a day, then log what you ate to see your calories and macros."
            action={<Button label="Add day" icon="plus" color={accent} onPress={handleAddDay} />}
          />
        }
      />

      {dailyLogs.length > 0 && (
        <Fab label="Add day" icon="calendar-plus" color={accent} onPress={handleAddDay} />
      )}

      {Platform.OS !== 'ios' && showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Sheet
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          title="Add a day"
          subtitle="Choose the date you want to log"
          footer={
            <Button
              label="Add day"
              color={accent}
              loading={isAddingDay}
              style={styles.flex}
              onPress={() => {
                setShowDatePicker(false);
                void saveSelectedDay(date);
              }}
            />
          }>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            onChange={onDateChange}
            themeVariant={scheme}
            accentColor={accent}
          />
        </Sheet>
      )}
    </ThemedView>
  );
}

function MacroText({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.macro}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <ThemedText type="caption" tone="muted">
        {label} {value}g
      </ThemedText>
    </View>
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
  chartCard: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chart: {
    marginTop: 8,
    paddingRight: DEFAULT_CHART_SCROLL_PADDING_RIGHT,
  },
  listHeader: {
    marginTop: 16,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingVertical: 12,
    paddingRight: 8,
  },
  dateBadge: {
    width: 52,
    height: 56,
    borderRadius: Radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dateDay: {
    fontFamily: Fonts?.displayBold,
    fontSize: 20,
    lineHeight: 24,
  },
  itemMain: {
    flex: 1,
    gap: 4,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 2,
  },
  macro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  macroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
