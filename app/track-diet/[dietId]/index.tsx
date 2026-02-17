import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { addDailyLog, DailyLog, deleteDailyLog, getDailyLogs, getMeals } from '@/services/database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type GraphMetric = 'calories' | 'protein' | 'carbs' | 'fats';

export default function DietDetailScreen() {
  const { dietId } = useLocalSearchParams<{ dietId: string }>();
  const [dailyLogs, setDailyLogs] = useState<(DailyLog & { totalStats: { calories: number; protein: number; carbs: number; fats: number } })[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('calories');
  const router = useRouter();

  const cardBackgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    loadData();
  }, [dietId]);

  const loadData = async () => {
    if (!dietId) return;
    const logs = await getDailyLogs(Number(dietId));
    
    // Calculate totals for each day
    const logsWithStats = await Promise.all(logs.map(async (log) => {
      const meals = await getMeals(log.id);
      const totalStats = meals.reduce((acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fats: acc.fats + meal.fats,
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
      return { ...log, totalStats };
    }));

    setDailyLogs(logsWithStats);
  };

  const handleAddDay = async () => {
    setShowDatePicker(true);
  };

  const onDateChange = async (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      // Check if log already exists
      const existing = dailyLogs.find(l => l.date === currentDate.toISOString().split('T')[0]);
      if (existing) {
        Alert.alert('Info', 'A log for this date already exists', [
            { text: 'Go to Log', onPress: () => router.push(`/track-diet/${dietId}/${existing.date}`) }
        ]);
        return;
      }

      try {
        await addDailyLog(Number(dietId), currentDate.toISOString().split('T')[0]);
        loadData();
        // Navigate to the new log
        router.push(`/track-diet/${dietId}/${currentDate.toISOString().split('T')[0]}`);
      } catch (e: any) {
        Alert.alert('Error', 'Failed to add day: ' + (e.message || e));
      }
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

    // Filter last 7 days for graph or all if less
    const sortedLogs = [...dailyLogs]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);

    const labels = sortedLogs.map(l => {
      const d = new Date(l.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const data = sortedLogs.map(l => l.totalStats[graphMetric]);

    return {
      labels,
      datasets: [{ data }],
    };
  }, [dailyLogs, graphMetric]);

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
                <LineChart
                  data={{
                    labels: graphData.labels,
                    datasets: graphData.datasets
                  }}
                  width={screenWidth - 32}
                  height={220}
                  chartConfig={{
                    backgroundColor: backgroundColor,
                    backgroundGradientFrom: backgroundColor,
                    backgroundGradientTo: backgroundColor,
                    decimalPlaces: 0,
                    color: (opacity = 1) => withAlpha(tintColor, opacity),
                    labelColor: () => textColor,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "4", strokeWidth: "2", stroke: tintColor }
                  }}
                  bezier
                  style={{ marginVertical: 8, borderRadius: 16 }}
                />
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
                        {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
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
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iosDatePickerDone}>
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
    height: 220,
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
