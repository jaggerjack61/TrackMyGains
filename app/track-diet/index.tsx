import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { addDiet, deleteDiet, Diet, getDiets, initDatabase, updateDiet, updateDietOrder } from '@/services/database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TrackDietScreen() {
  const [diets, setDiets] = useState<Diet[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newDietName, setNewDietName] = useState('');
  const [editingDiet, setEditingDiet] = useState<Diet | null>(null);
  const router = useRouter();

  const cardBackgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await initDatabase();
    const data = await getDiets();
    setDiets(data);
  };

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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Diet>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity 
          style={[
            styles.listItem, 
            { backgroundColor: cardBackgroundColor },
            isActive && { backgroundColor: tintColor, opacity: 0.9 }
          ]}
          onPress={() => router.push(`/track-diet/${item.id}`)}
          onLongPress={drag}
          disabled={isActive}
        >
          <View style={styles.itemContent}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="food-apple-outline" size={24} color={tintColor} />
            </View>
            <ThemedText type="defaultSemiBold" style={[styles.itemText, isActive && { color: '#FFF' }]}>{item.name}</ThemedText>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                <MaterialCommunityIcons name="pencil-outline" size={24} color={isActive ? '#FFF' : tintColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
                <MaterialCommunityIcons name="trash-can-outline" size={24} color={isActive ? '#FFF' : "#EF4444"} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Diets" />
        
        {/* List */}
        <DraggableFlatList
            data={diets}
            onDragEnd={onDragEnd}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <ThemedText>No diets yet. Add one to get started!</ThemedText>
                    <ThemedText style={{fontSize: 12, marginTop: 8, opacity: 0.7}}>Long press to reorder</ThemedText>
                </View>
            }
        />

        {/* FAB */}
        <TouchableOpacity
            style={[styles.fab, { backgroundColor: tintColor }]}
            onPress={() => {
                setEditingDiet(null);
                setNewDietName('');
                setModalVisible(true);
            }}
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
                <ThemedText type="subtitle" style={styles.modalTitle}>
                    {editingDiet ? 'Edit Diet' : 'New Diet'}
                </ThemedText>
                
                <View style={styles.inputGroup}>
                <ThemedText>Name:</ThemedText>
                <TextInput
                    style={[styles.input, { color: textColor, borderColor: tintColor }]}
                    onChangeText={setNewDietName}
                    value={newDietName}
                    placeholder="e.g. Bulking"
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
                    onPress={handleSaveDiet}
                >
                    <ThemedText style={{ color: '#FFF' }}>Save</ThemedText>
                </TouchableOpacity>
                </View>
            </View>
            </View>
        </Modal>
        </ThemedView>
    </GestureHandlerRootView>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
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
    alignItems: 'center',
  },
  buttonClose: {
    backgroundColor: '#ddd',
  },
});
