import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, withAlpha } from '@/constants/theme';
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
  const backgroundColor = useThemeColor({}, 'background');
  const mutedTextColor = useThemeColor({}, 'mutedText');

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
            <View
              style={[
                styles.iconBox,
                { backgroundColor: isActive ? withAlpha('#FFFFFF', 0.22) : withAlpha(tintColor, 0.12) },
              ]}
            >
              <MaterialCommunityIcons
                name="food-apple-outline"
                size={24}
                color={isActive ? '#FFFFFF' : tintColor}
              />
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
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: withAlpha(textColor, 0.12) }]} />}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <ThemedText type="title" style={styles.emptyTitle}>No diets yet.</ThemedText>
                    <ThemedText style={{ color: mutedTextColor, textAlign: 'center' }}>
                      Add one to get started.
                    </ThemedText>
                    <ThemedText type="label" style={{ color: mutedTextColor, marginTop: 10 }}>
                      Long press to reorder
                    </ThemedText>
                </View>
            }
        />

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: textColor }]}
            onPress={() => {
                setEditingDiet(null);
                setNewDietName('');
                setModalVisible(true);
            }}
        >
          <MaterialCommunityIcons name="plus" size={28} color={backgroundColor} />
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
                  placeholderTextColor={mutedTextColor}
                    autoFocus
                />
                </View>

                <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonClose, { borderColor: textColor }]}
                    onPress={() => setModalVisible(false)}
                >
                  <ThemedText type="label">Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: textColor }]}
                    onPress={handleSaveDiet}
                >
                  <ThemedText type="label" style={{ color: backgroundColor }}>Save</ThemedText>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 92,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    marginTop: 60,
    borderTopWidth: 1,
    width: '100%',
  },
  emptyTitle: {
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 0,
  },
  separator: {
    height: 1,
    width: '100%',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    marginRight: 14,
    width: 38,
    height: 38,
    borderRadius: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.14)',
  },
  itemText: {
    fontSize: 12,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    right: 18,
    bottom: 18,
    borderRadius: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  modalView: {
    margin: 20,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.16)',
    padding: 24,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    width: '86%',
  },
  modalTitle: {
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
    gap: 6,
  },
  input: {
    height: 44,
    marginTop: 2,
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderRadius: 0,
    fontFamily: Fonts?.serifItalic ?? Fonts?.serif,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 12,
  },
  button: {
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 110,
    alignItems: 'center',
  },
  buttonClose: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
});
