import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Fonts, getElevation, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SegmentOption<T> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Colour of the selected label; defaults to the regular text colour. */
  accent?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accent,
  size = 'md',
  style,
}: SegmentedControlProps<T>) {
  const { scheme, colors } = useTheme();
  const height = size === 'sm' ? 34 : 44;

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors.cardMuted, height: height + 8 }, style]}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.segment,
              { height },
              isSelected && [
                {
                  backgroundColor: scheme === 'dark' ? colors.borderStrong : colors.card,
                },
                getElevation(scheme, 1),
              ],
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { fontSize: size === 'sm' ? 13 : 14 },
                { color: isSelected ? (accent ?? colors.text) : colors.mutedText },
                isSelected && styles.labelSelected,
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radii.control,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.inner,
    paddingHorizontal: 6,
  },
  label: {
    fontFamily: Fonts?.sansMedium,
  },
  labelSelected: {
    fontFamily: Fonts?.sansBold,
  },
});
