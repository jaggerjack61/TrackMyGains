import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { addMeal, deleteMeal, getDailyLogByDate, getMeals, getRecentMeals, Meal, updateMeal } from '@/services/database';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function DailyLogScreen() {
  const { dietId, date } = useLocalSearchParams<{ dietId: string; date: string }>();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyLogId, setDailyLogId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState<Meal[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  const cardBackgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    loadData();
  }, [dietId, date]);

  const loadData = async () => {
    if (!dietId || !date) return;
    const log = await getDailyLogByDate(Number(dietId), date);
    if (log) {
        setDailyLogId(log.id);
        const data = await getMeals(log.id);
        setMeals(data);
    }
  };

  const handleNameChange = async (text: string) => {
    setName(text);
    if (text.length > 1) {
        const results = await getRecentMeals(text);
        setSuggestions(results);
        setShowSuggestions(true);
    } else {
        setSuggestions([]);
        setShowSuggestions(false);
    }
  };

  const handleSuggestionPress = (meal: Meal) => {
    setName(meal.name);
    setCalories(meal.calories.toString());
    setProtein(meal.protein.toString());
    setCarbs(meal.carbs.toString());
    setFats(meal.fats.toString());
    setShowSuggestions(false);
  };

  const handleSaveMeal = async () => {
    if (!name || !calories || !protein) {
      Alert.alert('Error', 'Name, Calories and Protein are required');
      return;
    }

    if (!dailyLogId) {
        Alert.alert('Error', 'Daily log not found');
        return;
    }

    const calVal = parseInt(calories, 10);
    const proVal = parseFloat(protein);
    const carbVal = parseFloat(carbs || '0');
    const fatVal = parseFloat(fats || '0');

    if (isNaN(calVal) || isNaN(proVal)) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    try {
      if (editingMeal) {
        await updateMeal(
          editingMeal.id,
          name.trim(),
          calVal,
          proVal,
          carbVal,
          fatVal
        );
      } else {
        await addMeal(
          dailyLogId,
          name.trim(),
          calVal,
          proVal,
          carbVal,
          fatVal
        );
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save meal: ' + (e.message || e));
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this meal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeal(id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete meal: ' + (e.message || e));
          }
        },
      },
    ]);
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setName(meal.name);
    setCalories(meal.calories.toString());
    setProtein(meal.protein.toString());
    setCarbs(meal.carbs.toString());
    setFats(meal.fats.toString());
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingMeal(null);
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const totalStats = useMemo(() => {
      return meals.reduce((acc, meal) => ({
          calories: acc.calories + meal.calories,
          protein: acc.protein + meal.protein,
          carbs: acc.carbs + meal.carbs,
          fats: acc.fats + meal.fats,
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [meals]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={date ? new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Daily Log'} />

      <FlatList
        ListHeaderComponent={
          <View style={[styles.summaryCard, { backgroundColor: cardBackgroundColor }]}>
            <ThemedText type="subtitle" style={styles.summaryTitle}>Daily Totals</ThemedText>
            <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                    <ThemedText style={styles.statLabel}>Calories</ThemedText>
                    <ThemedText type="title" style={{color: tintColor}}>{totalStats.calories}</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                    <ThemedText style={styles.statLabel}>Protein</ThemedText>
                    <ThemedText type="subtitle">{totalStats.protein}g</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                    <ThemedText style={styles.statLabel}>Carbs</ThemedText>
                    <ThemedText type="subtitle">{totalStats.carbs}g</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                    <ThemedText style={styles.statLabel}>Fats</ThemedText>
                    <ThemedText type="subtitle">{totalStats.fats}g</ThemedText>
                </View>
            </View>
          </View>
        }
        data={meals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.listItem, { backgroundColor: cardBackgroundColor }]}
            onPress={() => handleEdit(item)}
          >
            <View style={styles.itemHeader}>
              <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <View style={styles.itemDetails}>
                <ThemedText style={styles.detailText}>{item.calories} kcal</ThemedText>
                <ThemedText style={styles.detailText}>P: {item.protein}g</ThemedText>
                <ThemedText style={styles.detailText}>C: {item.carbs}g</ThemedText>
                <ThemedText style={styles.detailText}>F: {item.fats}g</ThemedText>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText>No meals logged yet.</ThemedText>
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
              {editingMeal ? 'Edit Meal' : 'Add Meal'}
            </ThemedText>

            <View style={[styles.inputGroup, { zIndex: 1000, elevation: 10 }]}>
                <ThemedText>Name:</ThemedText>
                <TextInput
                    style={[styles.input, { color: textColor, borderColor: tintColor }]}
                    onChangeText={handleNameChange}
                    value={name}
                    placeholder="e.g. Chicken Breast"
                    placeholderTextColor="#999"
                />
                {showSuggestions && suggestions.length > 0 && (
                    <View style={[styles.suggestionsContainer, { backgroundColor: cardBackgroundColor, borderColor: tintColor }]}>
                        <FlatList
                            data={suggestions}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSuggestionPress(item)}>
                                    <ThemedText>{item.name}</ThemedText>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}
            </View>

            <View style={styles.formRow}>
              <View style={{flex: 1, marginRight: 8}}>
                <ThemedText>Calories:</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  onChangeText={setCalories}
                  value={calories}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={{flex: 1}}>
                <ThemedText>Protein (g):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  onChangeText={setProtein}
                  value={protein}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={{flex: 1, marginRight: 8}}>
                <ThemedText>Carbs (g):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  onChangeText={setCarbs}
                  value={carbs}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={{flex: 1}}>
                <ThemedText>Fats (g):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  onChangeText={setFats}
                  value={fats}
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
                onPress={handleSaveMeal}
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
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
      marginBottom: 12,
      textAlign: 'center',
  },
  summaryStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  summaryItem: {
      alignItems: 'center',
  },
  statLabel: {
      fontSize: 12,
      opacity: 0.7,
      marginBottom: 4,
  },
  listItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDetails: {
      flexDirection: 'row',
      gap: 12,
  },
  detailText: {
      fontSize: 14,
      opacity: 0.8,
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
  inputGroup: {
      marginBottom: 16,
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
  suggestionsContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
  },
});
