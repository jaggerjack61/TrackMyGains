import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface DateFieldProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: StyleProp<ViewStyle>;
}

export const formatFieldDate = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Pressable date input. Android opens the native dialog; iOS expands an
 * inline calendar beneath the field.
 */
export function DateField({ label, value, onChange, minimumDate, maximumDate, style }: DateFieldProps) {
  const { scheme, colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setIsOpen(false);
    }
    if (event.type !== 'dismissed' && selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <ThemedText type="caption" tone="muted" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <Pressable
        onPress={() => setIsOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Date'}: ${formatFieldDate(value)}`}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: colors.cardMuted,
            borderColor: isOpen ? colors.tint : 'transparent',
          },
          pressed && styles.pressed,
        ]}>
        <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={isOpen ? colors.tint : colors.subtleText} />
        <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
          {formatFieldDate(value)}
        </Text>
        <MaterialCommunityIcons
          name={Platform.OS === 'ios' && isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.subtleText}
        />
      </Pressable>
      {isOpen && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          themeVariant={scheme}
          accentColor={colors.tint}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontFamily: Fonts?.sansMedium,
  },
  field: {
    minHeight: 52,
    borderRadius: Radii.control,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  value: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts?.sansMedium,
  },
  pressed: {
    opacity: 0.8,
  },
});
