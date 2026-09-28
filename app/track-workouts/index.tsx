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
import { addRoutine, deleteRoutine, getRoutines, initDatabase, Routine, updateRoutine, updateRoutineOrder } from '@/services/database';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TrackWorkoutsScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');

  // Edit mode
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  const router = useRouter();
  const { accents } = useTheme();
  const accent = accents.lifts;

  const loadData = useCallback(async () => {
    await initDatabase();
    const data = await getRoutines();
    setRoutines(data);
  }, []);

  useSyncRefresh(loadData);

  const handleSaveRoutine = async () => {
    if (!newRoutineName.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }

    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, newRoutineName.trim());
      } else {
        await addRoutine(newRoutineName.trim());
      }
      setModalVisible(false);
      setNewRoutineName('');
      setEditingRoutine(null);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save routine: ' + (e.message || e));
    }
  };

  const handleEdit = (routine: Routine) => {
    setEditingRoutine(routine);
    setNewRoutineName(routine.name);
    setModalVisible(true);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this routine? All workouts inside it will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoutine(id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete routine: ' + (e.message || e));
          }
        },
      },
    ]);
  };

  const onDragEnd = async ({ data }: { data: Routine[] }) => {
    setRoutines(data);
    try {
        await updateRoutineOrder(data);
    } catch (e) {
        console.error('Failed to update routine order', e);
        Alert.alert('Error', 'Failed to save order');
        loadData(); // Revert to db state on error
    }
  };

  const openNewRoutine = () => {
    setEditingRoutine(null);
    setNewRoutineName('');
    setModalVisible(true);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Routine>) => (
    <ScaleDecorator>
      <ListRow
        icon="notebook-outline"
        accent={accent}
        title={item.name}
        isActive={isActive}
        onPress={() => router.push(`/track-workouts/${item.id}`)}
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
        <Header eyebrow="Lifts" accent={accent} title="Routines" />

        <DraggableFlatList
          data={routines}
          onDragEnd={onDragEnd}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon="notebook-outline"
              accent={accent}
              title="No routines yet"
              message="Group your workouts into a routine, like Push / Pull / Legs."
              action={<Button label="New routine" icon="plus" color={accent} onPress={openNewRoutine} />}
            />
          }
          ListFooterComponent={
            routines.length > 1 ? (
              <ThemedText type="caption" tone="subtle" style={styles.hint}>
                Press and hold a routine to reorder
              </ThemedText>
            ) : null
          }
        />

        {routines.length > 0 && <Fab label="New routine" color={accent} onPress={openNewRoutine} />}

        <Sheet
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editingRoutine ? 'Rename routine' : 'New routine'}
          footer={
            <>
              <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setModalVisible(false)} />
              <Button label="Save" color={accent} style={styles.flex} onPress={handleSaveRoutine} />
            </>
          }>
          <TextField
            label="Name"
            onChangeText={setNewRoutineName}
            value={newRoutineName}
            placeholder="e.g. Push Day"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSaveRoutine}
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
