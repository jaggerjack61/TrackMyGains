import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getExercises, addExercise, deleteExercise, initDatabase, Exercise } from '@/services/database';
import { COMMON_EXERCISES } from '@/constants/exercises';

export default function WorkoutDetailScreen() {
  const { workoutId } = useLocalSearchParams();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const cardBackgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    loadData();
  }, [workoutId]);

  const loadData = async () => {
    if (!workoutId) return;
    await initDatabase();
    const data = await getExercises(Number(workoutId));
    setExercises(data);
  };

  const handleAddExercise = async (name: string) => {
    const exerciseName = name.trim();
    if (!exerciseName) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    try {
      await addExercise(Number(workoutId), exerciseName);
      setModalVisible(false);
      setNewExerciseName('');
      setShowSuggestions(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save exercise: ' + (e.message || e));
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this exercise?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExercise(id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete exercise: ' + (e.message || e));
          }
        },
      },
    ]);
  };

  const suggestions = useMemo(() => {
    if (!newExerciseName || !showSuggestions) return [];
    const lower = newExerciseName.toLowerCase();
    return COMMON_EXERCISES.filter(ex => ex.toLowerCase().includes(lower)).slice(0, 5);
  }, [newExerciseName, showSuggestions]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Exercises' }} />
      
      {/* List */}
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText>No exercises added yet.</ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.listItem, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.itemContent}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="weight-lifter" size={24} color={tintColor} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.itemText}>{item.name}</ThemedText>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
              <MaterialCommunityIcons name="trash-can-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
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
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.centeredView}
        >
          <View style={[styles.modalView, { backgroundColor: cardBackgroundColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Add Exercise</ThemedText>
            
            <View style={styles.inputGroup}>
              <ThemedText>Name:</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: tintColor }]}
                onChangeText={(text) => {
                    setNewExerciseName(text);
                    setShowSuggestions(true);
                }}
                value={newExerciseName}
                placeholder="e.g. Bench Press"
                placeholderTextColor="#999"
                autoFocus
              />
              {/* Autocomplete Suggestions */}
              {suggestions.length > 0 && (
                <View style={[styles.suggestionsContainer, { borderColor: tintColor, backgroundColor: cardBackgroundColor }]}>
                    {suggestions.map((item) => (
                        <TouchableOpacity 
                            key={item} 
                            style={styles.suggestionItem}
                            onPress={() => {
                                setNewExerciseName(item);
                                setShowSuggestions(false);
                            }}
                        >
                            <ThemedText>{item}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>
              )}
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
                onPress={() => handleAddExercise(newExerciseName)}
              >
                <ThemedText style={{ color: '#FFF' }}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    zIndex: 1,
  },
  input: {
    height: 40,
    marginTop: 5,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  suggestionsContainer: {
    marginTop: 5,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    zIndex: 0,
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
});
