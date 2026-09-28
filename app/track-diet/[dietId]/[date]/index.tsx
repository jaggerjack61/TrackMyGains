import { Header } from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { SectionHeader } from '@/components/ui/section-header';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Fonts, Radii } from '@/constants/theme';
import { useSyncRefresh } from '@/hooks/use-sync-refresh';
import { useTheme } from '@/hooks/use-theme';
import { addMeal, deleteMeal, getDailyLogByDate, getMeals, getRecentMeals, Meal, updateMeal } from '@/services/database';
import { parseLocalDateKey } from '@/services/date-utils';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

const formatAmount = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

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

  const { colors, accents, macros } = useTheme();
  const accent = accents.diet;

  const loadData = useCallback(async () => {
    if (!dietId || !date) return;
    const log = await getDailyLogByDate(Number(dietId), date);
    if (log) {
        setDailyLogId(log.id);
        const data = await getMeals(log.id);
        setMeals(data);
    } else {
        setDailyLogId(null);
        setMeals([]);
    }
  }, [dietId, date]);

  useSyncRefresh(loadData);

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
    if (!name.trim() || !calories || !protein) {
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

    if (
      !Number.isFinite(calVal)
      || !Number.isFinite(proVal)
      || !Number.isFinite(carbVal)
      || !Number.isFinite(fatVal)
      || calVal < 0
      || proVal < 0
      || carbVal < 0
      || fatVal < 0
    ) {
      Alert.alert('Error', 'Nutrition values must be valid non-negative numbers');
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

  const macroBreakdown = useMemo(() => {
    const energy = {
      protein: totalStats.protein * 4,
      carbs: totalStats.carbs * 4,
      fats: totalStats.fats * 9,
    };
    const totalEnergy = energy.protein + energy.carbs + energy.fats;
    return (['protein', 'carbs', 'fats'] as const).map((key) => ({
      key,
      label: key === 'fats' ? 'Fat' : key.charAt(0).toUpperCase() + key.slice(1),
      grams: totalStats[key],
      share: totalEnergy > 0 ? energy[key] / totalEnergy : 0,
      color: macros[key],
    }));
  }, [macros, totalStats]);

  const openAddMeal = () => {
    resetForm();
    setModalVisible(true);
  };

  const parsedDate = date ? parseLocalDateKey(date) : null;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        eyebrow={parsedDate ? parsedDate.toLocaleDateString(undefined, { weekday: 'long' }) : 'Diet'}
        accent={accent}
        title={parsedDate ? parsedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : 'Daily Log'}
      />

      <FlatList
        ListHeaderComponent={
          <View>
            <Card style={styles.summaryCard}>
              <View style={styles.caloriesRow}>
                <View>
                  <ThemedText type="overline" tone="subtle">Calories</ThemedText>
                  <ThemedText style={[styles.calories, { color: colors.text }]}>
                    {formatAmount(totalStats.calories)}
                    <ThemedText style={[styles.caloriesUnit, { color: colors.mutedText }]}> kcal</ThemedText>
                  </ThemedText>
                </View>
                <ThemedText type="caption" tone="muted">
                  {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                </ThemedText>
              </View>

              <View style={[styles.splitBar, { backgroundColor: colors.cardMuted }]}>
                {macroBreakdown.map((macro) =>
                  macro.share > 0 ? (
                    <View key={macro.key} style={{ flex: macro.share, backgroundColor: macro.color }} />
                  ) : null,
                )}
              </View>

              <View style={styles.macroGrid}>
                {macroBreakdown.map((macro) => (
                  <View key={macro.key} style={styles.macroCell}>
                    <View style={styles.macroLabelRow}>
                      <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
                      <ThemedText type="caption" tone="muted">{macro.label}</ThemedText>
                    </View>
                    <ThemedText style={styles.macroValue}>
                      {formatAmount(macro.grams)}
                      <ThemedText type="caption" tone="muted"> g</ThemedText>
                    </ThemedText>
                    <ThemedText type="caption" tone="subtle">{Math.round(macro.share * 100)}%</ThemedText>
                  </View>
                ))}
              </View>
            </Card>

            {meals.length > 0 && <SectionHeader title="Meals" caption="Tap a meal to edit it" style={styles.listHeader} />}
          </View>
        }
        data={meals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.listItem} onPress={() => handleEdit(item)} accessibilityLabel={`Edit ${item.name}`}>
            <View style={styles.itemMain}>
              <View style={styles.itemTitleRow}>
                <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.itemName}>{item.name}</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: accent }}>{item.calories} kcal</ThemedText>
              </View>
              <View style={styles.itemMacros}>
                <MacroText color={macros.protein} label="Protein" value={item.protein} />
                <MacroText color={macros.carbs} label="Carbs" value={item.carbs} />
                <MacroText color={macros.fats} label="Fat" value={item.fats} />
              </View>
            </View>
            <IconButton
              icon="trash-can-outline"
              color={colors.danger}
              size={36}
              onPress={() => handleDelete(item.id)}
              accessibilityLabel={`Delete ${item.name}`}
            />
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="silverware-fork-knife"
            accent={accent}
            title="No meals logged"
            message="Add what you ate today to track calories and macros."
            action={<Button label="Add meal" icon="plus" color={accent} onPress={openAddMeal} />}
          />
        }
      />

      {meals.length > 0 && <Fab label="Add meal" color={accent} onPress={openAddMeal} />}

      <Sheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingMeal ? 'Edit meal' : 'Add meal'}
        footer={
          <>
            <Button label="Cancel" variant="secondary" style={styles.flex} onPress={() => setModalVisible(false)} />
            <Button label="Save" color={accent} style={styles.flex} onPress={handleSaveMeal} />
          </>
        }>
        <View>
          <TextField
            label="Name"
            icon="magnify"
            onChangeText={handleNameChange}
            value={name}
            placeholder="e.g. Chicken Breast"
          />
          {showSuggestions && suggestions.length > 0 && (
            <View style={[styles.suggestions, { backgroundColor: colors.cardMuted }]}>
              {suggestions.map((item, index) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => handleSuggestionPress(item)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    pressed && { backgroundColor: colors.border },
                  ]}>
                  <MaterialCommunityIcons name="history" size={16} color={colors.subtleText} />
                  <ThemedText numberOfLines={1} style={styles.suggestionName}>{item.name}</ThemedText>
                  <ThemedText type="caption" tone="muted">{item.calories} kcal</ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.formRow}>
          <TextField
            label="Calories"
            suffix="kcal"
            containerStyle={styles.flex}
            onChangeText={setCalories}
            value={calories}
            keyboardType="number-pad"
            placeholder="0"
          />
          <TextField
            label="Protein"
            suffix="g"
            containerStyle={styles.flex}
            onChangeText={setProtein}
            value={protein}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>

        <View style={styles.formRow}>
          <TextField
            label="Carbs"
            suffix="g"
            containerStyle={styles.flex}
            onChangeText={setCarbs}
            value={carbs}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <TextField
            label="Fat"
            suffix="g"
            containerStyle={styles.flex}
            onChangeText={setFats}
            value={fats}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>
      </Sheet>
    </ThemedView>
  );
}

function MacroText({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.macroLabelRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <ThemedText type="caption" tone="muted">
        {label} {formatAmount(value)}g
      </ThemedText>
    </View>
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
  summaryCard: {
    gap: 16,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  calories: {
    fontFamily: Fonts?.display,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1.2,
  },
  caloriesUnit: {
    fontFamily: Fonts?.sansBold,
    fontSize: 16,
    letterSpacing: 0,
  },
  splitBar: {
    height: 10,
    borderRadius: Radii.full,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCell: {
    flex: 1,
    gap: 2,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroValue: {
    fontFamily: Fonts?.displayBold,
    fontSize: 20,
    lineHeight: 26,
  },
  listHeader: {
    marginTop: 24,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingVertical: 14,
    paddingRight: 8,
  },
  itemMain: {
    flex: 1,
    gap: 6,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemName: {
    flex: 1,
  },
  itemMacros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 2,
  },
  suggestions: {
    marginTop: 8,
    borderRadius: Radii.control,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionName: {
    flex: 1,
    fontSize: 15,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
