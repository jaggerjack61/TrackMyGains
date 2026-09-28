import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { ListRow } from '@/components/ui/list-row';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { COMMON_EXERCISES } from '@/constants/exercises';
import { Radii } from '@/constants/theme';
import { useSyncRefresh } from '@/hooks/use-sync-refresh';
import { useTheme } from '@/hooks/use-theme';
import { addExercise, deleteExercise, Exercise, getExercises, initDatabase, updateExercise } from '@/services/database';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

export default function WorkoutDetailScreen() {
  const { workoutId, routineId } = useLocalSearchParams();
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Edit mode
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const { colors, accents } = useTheme();
  const accent = accents.lifts;

  const loadData = useCallback(async () => {
    if (!workoutId) return;
    await initDatabase();
    const data = await getExercises(Number(workoutId));
    setExercises(data);
  }, [workoutId]);

  useSyncRefresh(loadData);

  const handleSaveExercise = async (name: string) => {
    const exerciseName = name.trim();
    if (!exerciseName) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    try {
      if (editingExercise) {
        await updateExercise(editingExercise.id, exerciseName);
      } else {
        await addExercise(Number(workoutId), exerciseName);
      }
      setModalVisible(false);
      setNewExerciseName('');
      setShowSuggestions(false);
      setEditingExercise(null);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save exercise: ' + (e.message || e));
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setNewExerciseName(exercise.name);
    setModalVisible(true);
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

  const openNewExercise = () => {
    setEditingExercise(null);
    setNewExerciseName('');
    setModalVisible(true);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header eyebrow="Lifts" accent={accent} title="Exercises" />

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="weight-lifter"
            accent={accent}
            title="No exercises yet"
            message="Add the movements you do in this workout to start logging sets."
            action={<Button label="Add exercise" icon="plus" color={accent} onPress={openNewExercise} />}
          />
        }
        renderItem={({ item }) => (
          <ListRow
            icon="weight-lifter"
            accent={accent}
            title={item.name}
            onPress={() => router.push({
              pathname: '/track-workouts/[routineId]/[workoutId]/[exerciseId]',
              params: {
                routineId: String(routineId),
                workoutId: String(workoutId),
                exerciseId: String(item.id),
                exerciseName: item.name,
              }
            })}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />

      {exercises.length > 0 && <Fab label="Add exercise" color={accent} onPress={openNewExercise} />}

      <Sheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingExercise ? 'Rename exercise' : 'Add exercise'}
        footer={
          <>
            <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setModalVisible(false)} />
            <Button label="Save" color={accent} style={styles.flex} onPress={() => handleSaveExercise(newExerciseName)} />
          </>
        }>
        <TextField
          label="Name"
          icon="magnify"
          onChangeText={(text) => {
            setNewExerciseName(text);
            setShowSuggestions(true);
          }}
          value={newExerciseName}
          placeholder="e.g. Bench Press"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => handleSaveExercise(newExerciseName)}
        />
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.suggestion,
                  { backgroundColor: colors.cardMuted },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  setNewExerciseName(item);
                  setShowSuggestions(false);
                }}>
                <MaterialCommunityIcons name="plus" size={14} color={accent} />
                <ThemedText type="caption" style={styles.suggestionText}>{item}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
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
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -4,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.full,
  },
  suggestionText: {
    fontWeight: '600',
  },
});
