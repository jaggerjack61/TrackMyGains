import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export default function EditorialGridOverlay() {
  const { width } = useWindowDimensions();
  const lineColor = useThemeColor({ light: 'rgba(26,26,26,0.14)', dark: 'rgba(249,248,246,0.16)' }, 'border');

  const positions = [24, width * 0.34, width * 0.66, Math.max(width - 24, 24)];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {positions.map((left, index) => (
        <View key={index} style={[styles.line, { left, backgroundColor: lineColor }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
});
