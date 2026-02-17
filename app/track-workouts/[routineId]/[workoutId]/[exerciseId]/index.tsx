import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { addExerciseLog, deleteExerciseLog, ExerciseLog, getExerciseLogs, updateExerciseLog } from '@/services/database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams } from 'expo-router';
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
    View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type GraphMetric = 'weight' | 'sets' | 'volume';

export default function ExerciseDetailScreen() {
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Graph State
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('weight');

  const cardBackgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    loadData();
  }, [exerciseId]);

  const loadData = async () => {
    if (!exerciseId) return;
    const data = await getExerciseLogs(Number(exerciseId));
    setLogs(data);
  };

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
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingLog(null);
    setDate(new Date());
    setWeight('');
    setReps('');
    setSets('');
    // Keep last used unit or default to kg
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const graphData = useMemo(() => {
    if (logs.length === 0) return null;

    // Filter last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Sort by date ascending for graph
    const sortedLogs = [...logs]
      .filter(l => new Date(l.date) >= oneMonthAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sortedLogs.length === 0) return null;

    const labels = sortedLogs.map(l => {
      const d = new Date(l.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const data = sortedLogs.map(l => {
      switch (graphMetric) {
        case 'sets': return l.sets;
        case 'volume': return l.weight * l.reps * l.sets;
        case 'weight': default: return l.weight;
      }
    });

    return {
      labels: labels.length > 6 ? [labels[0], labels[Math.floor(labels.length / 2)], labels[labels.length - 1]] : labels,
      datasets: [{ data }],
    };
  }, [logs, graphMetric]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={exerciseName || 'Exercise Details'} />

      <FlatList
        ListHeaderComponent={
          <View>
            {/* Graph Section */}
            <View style={styles.chartContainer}>
              <View style={styles.metricToggle}>
                {(['weight', 'sets', 'volume'] as GraphMetric[]).map((m) => (
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
                    decimalPlaces: graphMetric === 'sets' ? 0 : 1,
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
                  <ThemedText>No data for the last month</ThemedText>
                </View>
              )}
            </View>
            
            <ThemedText type="subtitle" style={styles.historyTitle}>History</ThemedText>
          </View>
        }
        data={logs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.logItem, { backgroundColor: cardBackgroundColor }]}
            onPress={() => handleEdit(item)}
          >
            <View style={styles.logHeader}>
              <ThemedText type="defaultSemiBold">{new Date(item.date).toLocaleDateString()}</ThemedText>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <View style={styles.logDetails}>
              <View style={styles.logStat}>
                <ThemedText style={styles.statLabel}>Weight</ThemedText>
                <ThemedText type="defaultSemiBold">{item.weight} {item.weight_unit}</ThemedText>
              </View>
              <View style={styles.logStat}>
                <ThemedText style={styles.statLabel}>Sets</ThemedText>
                <ThemedText type="defaultSemiBold">{item.sets}</ThemedText>
              </View>
              <View style={styles.logStat}>
                <ThemedText style={styles.statLabel}>Reps</ThemedText>
                <ThemedText type="defaultSemiBold">{item.reps}</ThemedText>
              </View>
              <View style={styles.logStat}>
                <ThemedText style={styles.statLabel}>Volume</ThemedText>
                <ThemedText type="defaultSemiBold">{(item.weight * item.sets * item.reps).toFixed(0)}</ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText>No logs yet. Add your first workout!</ThemedText>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: tintColor }]}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: cardBackgroundColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {editingLog ? 'Edit Log' : 'Add Log'}
            </ThemedText>

            <View style={styles.formRow}>
              <ThemedText>Date:</ThemedText>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                <ThemedText>{date.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>
            </View>

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

            <View style={styles.formRow}>
              <View style={{flex: 1, marginRight: 8}}>
                <ThemedText>Weight:</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  onChangeText={setWeight}
                  value={weight}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={{width: 80}}>
                <ThemedText>Unit:</ThemedText>
                <View style={styles.unitToggle}>
                  <TouchableOpacity 
                    style={[styles.unitButton, weightUnit === 'kg' && { backgroundColor: tintColor }]}
                    onPress={() => setWeightUnit('kg')}
                  >
                    <ThemedText style={{color: weightUnit === 'kg' ? '#FFF' : textColor}}>kg</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.unitButton, weightUnit === 'lbs' && { backgroundColor: tintColor }]}
                    onPress={() => setWeightUnit('lbs')}
                  >
                    <ThemedText style={{color: weightUnit === 'lbs' ? '#FFF' : textColor}}>lbs</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={{flex: 1, marginRight: 8}}>
                <ThemedText>Sets:</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  onChangeText={setSets}
                  value={sets}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={{flex: 1}}>
                <ThemedText>Reps:</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  onChangeText={setReps}
                  value={reps}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
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
                onPress={handleSaveLog}
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
  historyTitle: {
    marginLeft: 16,
    marginBottom: 8,
  },
  logItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    paddingBottom: 8,
  },
  logDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logStat: {
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
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 25,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  formRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    height: 40,
    marginTop: 5,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  dateButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  unitToggle: {
    flexDirection: 'row',
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    minWidth: 100,
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
