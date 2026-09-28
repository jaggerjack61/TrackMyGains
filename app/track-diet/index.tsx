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
import { addDiet, deleteDiet, Diet, getDiets, initDatabase, updateDiet, updateDietOrder } from '@/services/database';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TrackDietScreen() {
  const [diets, setDiets] = useState<Diet[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newDietName, setNewDietName] = useState('');
  const [editingDiet, setEditingDiet] = useState<Diet | null>(null);
  const router = useRouter();
  const { accents } = useTheme();
  const accent = accents.diet;

  const loadData = useCallback(async () => {
    await initDatabase();
    const data = await getDiets();
    setDiets(data);
  }, []);

  useSyncRefresh(loadData);

  const handleSaveDiet = async () => {
    if (!newDietName.trim()) {
      Alert.alert('Error', 'Please enter a diet name');
      return;
    }

    try {
      if (editingDiet) {
        await updateDiet(editingDiet.id, newDietName.trim());
      } else {
        await addDiet(newDietName.trim());
      }
      setModalVisible(false);
      setNewDietName('');
      setEditingDiet(null);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save diet: ' + (e.message || e));
    }
  };

  const handleEdit = (diet: Diet) => {
    setEditingDiet(diet);
    setNewDietName(diet.name);
    setModalVisible(true);
  };

  const onDragEnd = async ({ data }: { data: Diet[] }) => {
    setDiets(data);
    try {
        await updateDietOrder(data);
    } catch (e) {
        console.error('Failed to update diet order', e);
        Alert.alert('Error', 'Failed to save order');
        loadData(); // Revert to db state on error
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this diet? All logs inside it will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDiet(id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete diet: ' + (e.message || e));
          }
        },
      },
    ]);
  };

  const openNewDiet = () => {
    setEditingDiet(null);
    setNewDietName('');
    setModalVisible(true);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Diet>) => (
    <ScaleDecorator>
      <ListRow
        icon="food-apple-outline"
        accent={accent}
        title={item.name}
        isActive={isActive}
        onPress={() => router.push(`/track-diet/${item.id}`)}
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
        <Header eyebrow="Diet" accent={accent} title="Diet plans" />

        <DraggableFlatList
          data={diets}
          onDragEnd={onDragEnd}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon="food-apple-outline"
              accent={accent}
              title="No diet plans yet"
              message="Create a plan like Bulking or Cutting, then log your meals day by day."
              action={<Button label="New plan" icon="plus" color={accent} onPress={openNewDiet} />}
            />
          }
          ListFooterComponent={
            diets.length > 1 ? (
              <ThemedText type="caption" tone="subtle" style={styles.hint}>
                Press and hold a plan to reorder
              </ThemedText>
            ) : null
          }
        />

        {diets.length > 0 && <Fab label="New plan" color={accent} onPress={openNewDiet} />}

        <Sheet
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editingDiet ? 'Rename plan' : 'New diet plan'}
          footer={
            <>
              <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setModalVisible(false)} />
              <Button label="Save" color={accent} style={styles.flex} onPress={handleSaveDiet} />
            </>
          }>
          <TextField
            label="Name"
            onChangeText={setNewDietName}
            value={newDietName}
            placeholder="e.g. Bulking"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSaveDiet}
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
