import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface StatProps {
  label: string;
  value: string | number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}

const VALUE_SIZES = { sm: 17, md: 22, lg: 34 } as const;

export function Stat({ label, value, unit, size = 'md', color, align = 'left', style }: StatProps) {
  const { colors } = useTheme();
  const valueSize = VALUE_SIZES[size];

  return (
    <View style={[styles.container, align === 'center' && styles.center, style]}>
      <ThemedText type="overline" tone="subtle">
        {label}
      </ThemedText>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.value,
          {
            color: color ?? colors.text,
            fontSize: valueSize,
            lineHeight: Math.round(valueSize * 1.2),
            letterSpacing: size === 'lg' ? -0.8 : -0.3,
          },
        ]}>
        {value}
        {unit && <Text style={[styles.unit, { color: colors.mutedText, fontSize: Math.max(12, valueSize * 0.5) }]}> {unit}</Text>}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  center: {
    alignItems: 'center',
  },
  value: {
    fontFamily: Fonts?.displayBold,
  },
  unit: {
    fontFamily: Fonts?.sansMedium,
    letterSpacing: 0,
  },
});
