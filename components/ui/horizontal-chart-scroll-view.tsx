import {
  DEFAULT_CHART_HEIGHT,
  DEFAULT_CHART_PADDING_TOP,
  DEFAULT_CHART_PLOT_AREA_RATIO,
  DEFAULT_CHART_Y_AXIS_WIDTH,
} from '@/constants/charts';
import { calculateInitialChartScrollOffset } from '@/services/chart-timeline';
import React, { PropsWithChildren, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

type FixedYAxisConfig = {
  color: string;
  labels: string[];
  width?: number;
};

type HorizontalChartScrollViewProps = PropsWithChildren<{
  contentWidth: number;
  onTouchCancel?: (event: GestureResponderEvent) => void;
  onTouchEnd?: (event: GestureResponderEvent) => void;
  onTouchMove?: (event: GestureResponderEvent) => void;
  onTouchStart?: (event: GestureResponderEvent) => void;
  viewportWidth: number;
  yAxis?: FixedYAxisConfig;
}>;

const calculateYAxisLabelTop = (labelIndex: number, labelsCount: number) => {
  const segments = Math.max(1, labelsCount - 1);
  const plotHeight = DEFAULT_CHART_HEIGHT * DEFAULT_CHART_PLOT_AREA_RATIO;

  return DEFAULT_CHART_PADDING_TOP + (plotHeight / segments) * labelIndex - 8;
};

function FixedYAxis({ color, labels, width = DEFAULT_CHART_Y_AXIS_WIDTH }: FixedYAxisConfig) {
  const topToBottomLabels = [...labels].reverse();

  return (
    <View style={[styles.yAxis, { height: DEFAULT_CHART_HEIGHT, width }]}>
      {topToBottomLabels.map((label, index) => (
        <Text
          key={`${label}-${index}`}
          numberOfLines={1}
          style={[styles.yAxisLabel, { color, top: calculateYAxisLabelTop(index, topToBottomLabels.length) }]}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}

export function HorizontalChartScrollView({
  children,
  contentWidth,
  onTouchCancel,
  onTouchEnd,
  onTouchMove,
  onTouchStart,
  viewportWidth,
  yAxis,
}: HorizontalChartScrollViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const initialScrollOffset = useMemo(
    () => calculateInitialChartScrollOffset(contentWidth, viewportWidth),
    [contentWidth, viewportWidth],
  );

  const handleContentSizeChange = () => {
    if (initialScrollOffset <= 0) return;

    scrollViewRef.current?.scrollTo({ x: initialScrollOffset, y: 0, animated: false });
  };

  return (
    <View style={styles.frame}>
      {yAxis && <FixedYAxis {...yAxis} />}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={contentWidth > viewportWidth}
        style={[styles.container, { width: viewportWidth }]}
        contentContainerStyle={styles.content}
        contentOffset={{ x: initialScrollOffset, y: 0 }}
        onContentSizeChange={handleContentSizeChange}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  container: {
    flexGrow: 0,
  },
  content: {
    alignItems: 'center',
  },
  yAxis: {
    position: 'relative',
  },
  yAxisLabel: {
    fontSize: 11,
    fontWeight: '600',
    position: 'absolute',
    right: 8,
    textAlign: 'right',
    width: DEFAULT_CHART_Y_AXIS_WIDTH - 10,
  },
});