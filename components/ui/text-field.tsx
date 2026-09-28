import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/components/ui/icon-badge';
import { Fonts, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  icon?: IconName;
  /** Unit shown inside the field on the right, e.g. "kg". */
  suffix?: string;
  /** Renders the value faded, e.g. for a prediction the user hasn't accepted. */
  dimmed?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, icon, suffix, dimmed, containerStyle, inputStyle, onFocus, onBlur, ...inputProps },
  ref,
) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText type="caption" tone="muted" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.cardMuted,
            borderColor: isFocused ? colors.tint : 'transparent',
          },
        ]}>
        {icon && <MaterialCommunityIcons name={icon} size={20} color={isFocused ? colors.tint : colors.subtleText} />}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.subtleText}
          selectionColor={colors.tint}
          cursorColor={colors.tint}
          {...inputProps}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, { color: dimmed ? colors.subtleText : colors.text }, inputStyle]}
        />
        {suffix && <Text style={[styles.suffix, { color: colors.mutedText }]}>{suffix}</Text>}
      </View>
      {hint && (
        <ThemedText type="caption" tone="subtle">
          {hint}
        </ThemedText>
      )}
    </View>
  );
});

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
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts?.sansMedium,
    paddingVertical: 12,
  },
  suffix: {
    fontSize: 14,
    fontFamily: Fonts?.sansMedium,
  },
});
