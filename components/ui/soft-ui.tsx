import React from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
  View,
} from 'react-native';

import { getSoftShadow, type SoftDepth } from '@/constants/neumorphism';
import { Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

interface SoftSurfaceProps extends ViewProps {
  depth?: SoftDepth;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
}

export function SoftSurface({
  children,
  style,
  contentStyle,
  depth = 'extruded',
  radius = Radii.control,
  ...rest
}: SoftSurfaceProps) {
  const theme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'card');
  const shadow = getSoftShadow(theme, depth);

  return (
    <View style={[styles.layer, shadow.dark, { borderRadius: radius, backgroundColor }, style]} {...rest}>
      <View style={[styles.innerLayer, shadow.light, { borderRadius: radius, backgroundColor }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

interface SoftButtonProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  depth?: SoftDepth;
  activeDepth?: SoftDepth;
  radius?: number;
}

export function SoftButton({
  children,
  style,
  contentStyle,
  depth = 'extrudedSmall',
  activeDepth = 'pressedSmall',
  radius = Radii.control,
  ...rest
}: SoftButtonProps) {
  return (
    <Pressable {...rest} style={style}>
      {({ pressed }) => (
        <SoftSurface
          depth={pressed ? activeDepth : depth}
          radius={radius}
          contentStyle={[styles.buttonContent, pressed && styles.pressedContent, contentStyle]}>
          {children}
        </SoftSurface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layer: {
    overflow: 'visible',
  },
  innerLayer: {
    overflow: 'hidden',
  },
  buttonContent: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pressedContent: {
    transform: [{ translateY: 0.5 }],
  },
});
