import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getWorkouts, addWorkout, deleteWorkout, initDatabase, Workout } from '@/services/database';

export default function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  
  const router = useRouter();
  const cardBackgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    loadData();
  }, [routineId]);

  const loadData = async () => {
    if (!routineId) return;
    await initDatabase();
    const data = await getWorkouts(Number(routineId));
    setWorkouts(data);
  };

  const handleAddWorkout = async () => {
    if (!newWorkoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }

    try {
      await addWorkout(Number(routineId), newWorkoutName.trim());
      setModalVisible(false);
      setNewWorkoutName('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save workout: ' + (e.message || e));
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkout(id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete workout: ' + (e.message || e));
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Workouts' }} />
      
      {/* List */}
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText>No workouts yet. Start tracking!</ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.listItem, { backgroundColor: cardBackgroundColor }]}
            onPress={() => router.push(`/track-workouts/${routineId}/${item.id}`)}
          >
            <View style={styles.itemContent}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="dumbbell" size={24} color={tintColor} />
              </View>
              <View>
                <ThemedText type="defaultSemiBold" style={styles.itemText}>{item.name}</ThemedText>
                <ThemedText style={styles.dateText}>{new Date(item.date).toLocaleDateString()}</ThemedText>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
              <MaterialCommunityIcons name="trash-can-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
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
            <ThemedText type="subtitle" style={styles.modalTitle}>New Workout</ThemedText>
            
            <View style={styles.inputGroup}>
              <ThemedText>Name:</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: tintColor }]}
                onChangeText={setNewWorkoutName}
                value={newWorkoutName}
                placeholder="e.g. Week 1 - Monday"
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
                onPress={handleAddWorkout}
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
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 50,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(109, 40, 217, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.6,
  },
  deleteButton: {
    padding: 8,
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
    alignItems: 'center',  },
  buttonClose: {
    backgroundColor: '#ddd',
  },
});
