import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HorizontalChartScrollView } from '@/components/ui/horizontal-chart-scroll-view';
import { DEFAULT_CHART_HEIGHT, DEFAULT_CHART_HORIZONTAL_INSET, DEFAULT_CHART_SCROLL_PADDING_RIGHT, DEFAULT_CHART_Y_AXIS_WIDTH } from '@/constants/charts';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { buildChartYAxis, buildYAxisBoundsDataset } from '@/services/chart-axis';
import { buildScrollableChartLabels, calculateScrollableChartWidth } from '@/services/chart-timeline';
import { addDailyLog, DailyLogWithStats, deleteDailyLog, getDailyLogsWithStats } from '@/services/database';
import { formatLocalDateKey, parseLocalDateKey } from '@/services/date-utils';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    TouchableOpacity,
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

  const cardBackgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

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

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

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
      <Header title="Diet History" />

      <FlatList
        ListHeaderComponent={
          <View>
             {/* Graph Section */}
             <View style={styles.chartContainer}>
              <View style={styles.metricToggle}>
                {(['calories', 'protein', 'carbs', 'fats'] as GraphMetric[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.metricButton,
                      graphMetric === m && { backgroundColor: tintColor },
                      { borderColor: tintColor }
                    ]}
                    onPress={() => setGraphMetric(m)}
                  >
                    <ThemedText style={[
                      styles.metricText,
                      graphMetric === m && { color: '#FFF' }
                    ]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {graphData ? (
                <HorizontalChartScrollView
                  viewportWidth={chartViewportWidth}
                  contentWidth={graphData.chartWidth}
                  yAxis={{ labels: graphData.axis.labels, color: textColor }}
                >
                  <LineChart
                    data={{
                      labels: graphData.labels,
                      datasets: graphData.datasets
                    }}
                    width={graphData.chartWidth}
                    height={DEFAULT_CHART_HEIGHT}
                    chartConfig={{
                      backgroundColor: backgroundColor,
                      backgroundGradientFrom: backgroundColor,
                      backgroundGradientTo: backgroundColor,
                      decimalPlaces: graphData.axis.decimalPlaces,
                      color: (opacity = 1) => withAlpha(tintColor, opacity),
                      labelColor: () => textColor,
                      style: { borderRadius: 16 },
                      propsForDots: { r: "4", strokeWidth: "2", stroke: tintColor }
                    }}
                    bezier
                    fromNumber={graphData.axis.max}
                    fromZero={graphData.axis.min === 0}
                    segments={graphData.axis.segments}
                    style={{ marginVertical: 8, borderRadius: 16, paddingRight: DEFAULT_CHART_SCROLL_PADDING_RIGHT }}
                    withHorizontalLabels={false}
                  />
                </HorizontalChartScrollView>
              ) : (
                <View style={styles.noDataContainer}>
                  <ThemedText>No data yet</ThemedText>
                </View>
              )}
            </View>

            <ThemedText type="subtitle" style={styles.sectionTitle}>Daily Logs</ThemedText>
          </View>
        }
        data={dailyLogs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.listItem, { backgroundColor: cardBackgroundColor }]}
            onPress={() => router.push(`/track-diet/${dietId}/${item.date}`)}
          >
            <View style={styles.itemHeader}>
                <View style={styles.dateContainer}>
                    <MaterialCommunityIcons name="calendar" size={20} color={tintColor} />
                    <ThemedText type="defaultSemiBold" style={styles.dateText}>
                        {parseLocalDateKey(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </ThemedText>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>Cals</ThemedText>
                    <ThemedText type="defaultSemiBold">{item.totalStats.calories}</ThemedText>
                </View>
                <View style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>Pro</ThemedText>
                    <ThemedText type="defaultSemiBold">{item.totalStats.protein}g</ThemedText>
                </View>
                <View style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>Carbs</ThemedText>
                    <ThemedText type="defaultSemiBold">{item.totalStats.carbs}g</ThemedText>
                </View>
                <View style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>Fat</ThemedText>
                    <ThemedText type="defaultSemiBold">{item.totalStats.fats}g</ThemedText>
                </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <ThemedText>No days tracked yet.</ThemedText>
            </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: tintColor }]}
        onPress={handleAddDay}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {showDatePicker && (
        <View>
            <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
            />
            {Platform.OS === 'ios' && (
                <TouchableOpacity
                  disabled={isAddingDay}
                  onPress={() => {
                    setShowDatePicker(false);
                    void saveSelectedDay(date);
                  }}
                  style={styles.iosDatePickerDone}>
                    <ThemedText style={{color: tintColor}}>Done</ThemedText>
                </TouchableOpacity>
            )}
        </View>
        )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  noDataContainer: {
    height: DEFAULT_CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricToggle: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metricButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    marginLeft: 16,
    marginBottom: 8,
  },
  listItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    paddingBottom: 8,
  },
  dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  dateText: {
      fontSize: 16,
  },
  statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  statItem: {
      alignItems: 'center',
  },
  statLabel: {
      fontSize: 12,
      opacity: 0.7,
      marginBottom: 2,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 50,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  iosDatePickerDone: {
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
});
