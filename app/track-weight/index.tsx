import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HorizontalChartScrollView } from '@/components/ui/horizontal-chart-scroll-view';
import { DEFAULT_CHART_HEIGHT, DEFAULT_CHART_HORIZONTAL_INSET, DEFAULT_CHART_SCROLL_PADDING_RIGHT, DEFAULT_CHART_Y_AXIS_WIDTH } from '@/constants/charts';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { buildChartYAxis, buildYAxisBoundsDataset } from '@/services/chart-axis';
import { buildScrollableChartLabels, calculateScrollableChartWidth } from '@/services/chart-timeline';
import { addWeight, deleteWeight, getWeights, initDatabase } from '@/services/database';
import { useSyncRefresh } from '@/hooks/use-sync-refresh';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface WeightRecord {
  id: number;
  weight: number;
  date: string;
}

export default function TrackWeightScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const chartFrameWidth = screenWidth - DEFAULT_CHART_HORIZONTAL_INSET;
  const chartViewportWidth = chartFrameWidth - DEFAULT_CHART_Y_AXIS_WIDTH;
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const cardBackgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');

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
        color: (opacity = 1) => withAlpha(tintColor, opacity),
        strokeWidth: 2,
      },
    ];

    return {
      axis,
      chartWidth: calculateScrollableChartWidth(chartDates, chartViewportWidth),
      labels,
      datasets: [...visibleDatasets, buildYAxisBoundsDataset(axis, labels.length)],
      legend: ['Weight']
    };
  }, [chartViewportWidth, chronologicalWeights, tintColor]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || newDate;
    setNewDate(currentDate);
    if (Platform.OS === 'android') {
        setShowDatePicker(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Track Weight" />

      {/* Graph */}
      <View style={styles.chartContainer}>
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
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: tintColor,
                }
              }}
              bezier
              fromNumber={graphData.axis.max}
              fromZero={graphData.axis.min === 0}
              segments={graphData.axis.segments}
              style={{
                marginVertical: 8,
                borderRadius: 16,
                paddingRight: DEFAULT_CHART_SCROLL_PADDING_RIGHT,
              }}
              withHorizontalLabels={false}
              hidePointsAtIndex={graphData.labels.length > 10 ? Array.from({ length: graphData.labels.length }, (_, i) => i).filter(i => i % 5 !== 0) : []}
            />
          </HorizontalChartScrollView>
        ) : (
          <View style={styles.noDataContainer}>
            <ThemedText>No data yet</ThemedText>
          </View>
        )}
      </View>

      {/* List */}
      <FlatList
        data={sortedWeights}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.listItem, { borderBottomColor: borderColor }]}>
            <View>
              <ThemedText type="defaultSemiBold">{item.weight} kg</ThemedText>
              <ThemedText style={styles.dateText}>{new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}</ThemedText>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <MaterialCommunityIcons name="trash-can-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: tintColor }]}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: cardBackgroundColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Add Weight</ThemedText>
            
            <View style={styles.inputGroup}>
              <ThemedText>Date:</ThemedText>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[styles.modalDateButton, { borderColor }]}
              >
                <ThemedText>{newDate.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <View>
                <DateTimePicker
                    value={newDate}
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

            <View style={styles.inputGroup}>
              <ThemedText>Weight (kg):</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: borderColor }]}
                onChangeText={setNewWeight}
                value={newWeight}
                keyboardType="numeric"
                placeholder="0.0"
                placeholderTextColor={mutedTextColor}
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonClose, { borderColor }]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: tintColor }]}
                onPress={handleAddWeight}
              >
                <ThemedText style={{ color: '#FFF' }}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  noDataContainer: {
    height: DEFAULT_CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 100,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  modalDateButton: {
    padding: 10,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  input: {
    height: 40,
    marginTop: 5,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonClose: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  iosDatePickerDone: {
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
});
