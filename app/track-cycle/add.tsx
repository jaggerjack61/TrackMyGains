import { Header } from '@/components/Header';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { addCycle } from '@/services/database';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AddCycleScreen() {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 84))); // Default 12 weeks
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const router = useRouter();
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a cycle name');
      return;
    }
    try {
      await addCycle(name, startDate.toISOString(), endDate.toISOString());
      router.back();
    } catch (e: any) {
      alert('Error saving cycle: ' + (e.message || e));
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Header title="New Cycle" />

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <ThemedText type="subtitle">Cycle Name</ThemedText>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: iconColor }]}
            placeholder="e.g. Summer Bulk 2024"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="subtitle">Start Date</ThemedText>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: iconColor }]}
            onPress={() => setShowStartPicker(true)}
          >
            <ThemedText>{startDate.toLocaleDateString()}</ThemedText>
            <MaterialCommunityIcons name="calendar" size={24} color={iconColor} />
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="subtitle">End Date</ThemedText>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: iconColor }]}
            onPress={() => setShowEndPicker(true)}
          >
            <ThemedText>{endDate.toLocaleDateString()}</ThemedText>
            <MaterialCommunityIcons name="calendar" size={24} color={iconColor} />
          </TouchableOpacity>
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={onEndDateChange}
              minimumDate={startDate}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: tintColor }]}
          onPress={handleSave}
        >
          <ThemedText style={styles.saveButtonText}>Start Cycle</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 24,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  saveButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
