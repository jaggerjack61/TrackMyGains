import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { ListRow } from '@/components/ui/list-row';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { useSyncRefresh } from '@/hooks/use-sync-refresh';
import { useTheme } from '@/hooks/use-theme';
import { addWorkout, deleteWorkout, getWorkouts, initDatabase, updateWorkout, updateWorkoutOrder, Workout } from '@/services/database';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');

  // Edit mode
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

  const router = useRouter();
  const { accents } = useTheme();
  const accent = accents.lifts;

  const loadData = useCallback(async () => {
    if (!routineId) return;
    await initDatabase();
    const data = await getWorkouts(Number(routineId));
    setWorkouts(data);
  }, [routineId]);

  useSyncRefresh(loadData);

  const handleSaveWorkout = async () => {
    if (!newWorkoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }

    try {
      if (editingWorkout) {
        await updateWorkout(editingWorkout.id, newWorkoutName.trim());
      } else {
        await addWorkout(Number(routineId), newWorkoutName.trim());
      }
      setModalVisible(false);
      setNewWorkoutName('');
      setEditingWorkout(null);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save workout: ' + (e.message || e));
    }
  };

  const handleEdit = (workout: Workout) => {
    setEditingWorkout(workout);
    setNewWorkoutName(workout.name);
    setModalVisible(true);
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

  const onDragEnd = async ({ data }: { data: Workout[] }) => {
    setWorkouts(data);
    try {
        await updateWorkoutOrder(data);
    } catch (e) {
        console.error('Failed to update workout order', e);
        Alert.alert('Error', 'Failed to save order');
        loadData(); // Revert to db state on error
    }
  };

  const openNewWorkout = () => {
    setEditingWorkout(null);
    setNewWorkoutName('');
    setModalVisible(true);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Workout>) => (
    <ScaleDecorator>
      <ListRow
        icon="dumbbell"
        accent={accent}
        title={item.name}
        isActive={isActive}
        onPress={() => router.push(`/track-workouts/${routineId}/${item.id}`)}
        onLongPress={drag}
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item.id)}
      />
    </ScaleDecorator>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header eyebrow="Lifts" accent={accent} title="Workouts" />

        <DraggableFlatList
          data={workouts}
          onDragEnd={onDragEnd}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon="dumbbell"
              accent={accent}
              title="No workouts yet"
              message="Add the sessions in this routine, like Monday or Upper Body."
              action={<Button label="New workout" icon="plus" color={accent} onPress={openNewWorkout} />}
            />
          }
          ListFooterComponent={
            workouts.length > 1 ? (
              <ThemedText type="caption" tone="subtle" style={styles.hint}>
                Press and hold a workout to reorder
              </ThemedText>
            ) : null
          }
        />

        {workouts.length > 0 && <Fab label="New workout" color={accent} onPress={openNewWorkout} />}

        <Sheet
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editingWorkout ? 'Rename workout' : 'New workout'}
          footer={
            <>
              <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setModalVisible(false)} />
              <Button label="Save" color={accent} style={styles.flex} onPress={handleSaveWorkout} />
            </>
          }>
          <TextField
            label="Name"
            onChangeText={setNewWorkoutName}
            value={newWorkoutName}
            placeholder="e.g. Week 1 - Monday"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSaveWorkout}
          />
        </Sheet>
      </ThemedView>
    </GestureHandlerRootView>
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
  hint: {
    textAlign: 'center',
    marginTop: 8,
  },
});
