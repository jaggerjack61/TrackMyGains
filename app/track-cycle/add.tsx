import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/cycle/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { TextField } from '@/components/ui/text-field';
import { Fonts, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addCycle } from '@/services/database';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DURATION_PRESETS = [8, 12, 16, 20];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export default function AddCycleScreen() {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 84)); // Default 12 weeks
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();
  const { colors, accents } = useTheme();
  const accent = accents.cycle;

  const durationDays = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY));
  const durationWeeks = durationDays / 7;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a cycle name');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('Invalid dates', 'End date must be on or after the start date');
      return;
    }
    setIsSaving(true);
    try {
      await addCycle(name, startDate.toISOString(), endDate.toISOString());
      router.back();
    } catch (e: any) {
      Alert.alert('Error', 'Error saving cycle: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartChange = (date: Date) => {
    const currentDuration = endDate.getTime() - startDate.getTime();
    setStartDate(date);
    setEndDate(new Date(date.getTime() + Math.max(0, currentDuration)));
  };

  return (
    <FormScreen
      eyebrow="Cycle"
      title="New cycle"
      accent={accent}
      footer={<Button label="Start cycle" size="lg" color={accent} loading={isSaving} onPress={handleSave} />}>
      <Card style={styles.card}>
        <TextField
          label="Cycle name"
          placeholder="e.g. Summer Bulk"
          value={name}
          onChangeText={setName}
          autoFocus
        />
      </Card>

      <Card style={styles.card}>
        <DateField label="Start date" value={startDate} onChange={handleStartChange} />
        <DateField label="End date" value={endDate} onChange={setEndDate} minimumDate={startDate} />

        <View style={styles.presetBlock}>
          <ThemedText type="caption" tone="muted" style={styles.presetLabel}>Quick length</ThemedText>
          <View style={styles.presets}>
            {DURATION_PRESETS.map((weeks) => {
              const isSelected = durationDays === weeks * 7;
              return (
                <Pressable
                  key={weeks}
                  onPress={() => setEndDate(addDays(startDate, weeks * 7))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.preset,
                    { backgroundColor: isSelected ? withAlpha(accent, 0.14) : colors.cardMuted },
                    isSelected && { borderColor: accent },
                  ]}>
                  <ThemedText type="caption" style={[styles.presetText, { color: isSelected ? accent : colors.text }]}>
                    {weeks} wk
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.duration, { backgroundColor: colors.cardMuted }]}>
          <ThemedText type="caption" tone="muted">Duration</ThemedText>
          <ThemedText type="defaultSemiBold">
            {Number.isInteger(durationWeeks) ? durationWeeks : durationWeeks.toFixed(1)} weeks · {durationDays} days
          </ThemedText>
        </View>
      </Card>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  presetBlock: {
    gap: 8,
  },
  presetLabel: {
    fontFamily: Fonts?.sansMedium,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
  },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radii.inner,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetText: {
    fontFamily: Fonts?.sansBold,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.inner,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
