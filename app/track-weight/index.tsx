import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { addWeight, deleteWeight, getWeights, initDatabase } from '@/services/database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface WeightRecord {
  id: number;
  weight: number;
  date: string;
}

export default function TrackWeightScreen() {
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Filter range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 28); // 4 weeks ago
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const cardBackgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await initDatabase();
    const data = await getWeights();
    setWeights(data);
  };

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

  const filteredWeights = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return weights
      .filter((w) => {
        const d = new Date(w.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weights, startDate, endDate]);

  const graphData = useMemo(() => {
    if (filteredWeights.length === 0) return null;
    
    // To avoid overcrowding X-axis, we might want to sample or format dates
    const labels = filteredWeights.map(w => {
      const d = new Date(w.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const data = filteredWeights.map(w => w.weight);

    return {
      labels: labels.length > 6 ? [labels[0], labels[Math.floor(labels.length / 2)], labels[labels.length - 1]] : labels,
      datasets: [
        {
          data: data,
          color: (opacity = 1) => `rgba(109, 40, 217, ${opacity})`, // primary color
          strokeWidth: 2,
        },
      ],
      legend: ['Weight']
    };
  }, [filteredWeights]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || newDate;
    setNewDate(currentDate);
    if (Platform.OS === 'android') {
        setShowDatePicker(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Track Weight' }} />
      
      {/* Date Range Picker */}
      <View style={[styles.rangeContainer, { backgroundColor: cardBackgroundColor }]}>
        <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateButton}>
          <ThemedText>Start: {startDate.toLocaleDateString()}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateButton}>
          <ThemedText>End: {endDate.toLocaleDateString()}</ThemedText>
        </TouchableOpacity>
      </View>

      {showStartDatePicker && (
        <View>
            <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
                if (date) setStartDate(date);
                if (Platform.OS === 'android') setShowStartDatePicker(false);
            }}
            />
            {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)} style={styles.iosDatePickerDone}>
                    <ThemedText style={{color: tintColor}}>Done</ThemedText>
                </TouchableOpacity>
            )}
        </View>
      )}
      {showEndDatePicker && (
        <View>
            <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
                if (date) setEndDate(date);
                if (Platform.OS === 'android') setShowEndDatePicker(false);
            }}
            />
            {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)} style={styles.iosDatePickerDone}>
                    <ThemedText style={{color: tintColor}}>Done</ThemedText>
                </TouchableOpacity>
            )}
        </View>
      )}

      {/* Graph */}
      <View style={styles.chartContainer}>
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
             decimalPlaces: 1,
             color: (opacity = 1) => `rgba(109, 40, 217, ${opacity})`,
             labelColor: (opacity = 1) => textColor,
             style: {
               borderRadius: 16,
             },
             propsForDots: {
               r: "6",
               strokeWidth: "2",
               stroke: "#ffa726"
             }
           }}
           bezier
           style={{
             marginVertical: 8,
             borderRadius: 16,
           }}
           hidePointsAtIndex={graphData.labels.length > 10 ? Array.from({length: graphData.labels.length}, (_, i) => i).filter(i => i % 5 !== 0) : []}
         />
        ) : (
          <View style={styles.noDataContainer}>
            <ThemedText>No data for selected range</ThemedText>
          </View>
        )}
      </View>

      {/* List */}
      <FlatList
        data={[...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.listItem, { borderBottomColor: cardBackgroundColor }]}>
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
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.modalDateButton}>
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
                style={[styles.input, { color: textColor, borderColor: tintColor }]}
                onChangeText={setNewWeight}
                value={newWeight}
                keyboardType="numeric"
                placeholder="0.0"
                placeholderTextColor="#999"
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonClose]}
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
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    margin: 16,
    borderRadius: 12,
  },
  dateButton: {
    padding: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
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
    bottom: 20,
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
    backgroundColor: '#ddd',
  },
  iosDatePickerDone: {
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
});
