import { describe, expect, it } from '@jest/globals';

import {
  buildCycleChartLabels,
  calculateCycleChartWidth,
  calculateTouchDistance,
  getPinchAdjustedZoom,
} from './cycle-chart';

const sampleDates = Array.from({ length: 12 }, (_, index) => `2026-03-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`);

describe('cycle chart helpers', () => {
  it('keeps label positions aligned with the data points', () => {
    const labels = buildCycleChartLabels(sampleDates, 1);

    expect(labels).toHaveLength(sampleDates.length);
    expect(labels[0]).toBe('3/1');
    expect(labels.at(-1)).toBe('3/12');
  });

  it('shows more visible labels as x zoom increases', () => {
    const baseLabels = buildCycleChartLabels(sampleDates, 1).filter(Boolean);
    const zoomedLabels = buildCycleChartLabels(sampleDates, 2).filter(Boolean);

    expect(zoomedLabels.length).toBeGreaterThan(baseLabels.length);
  });

  it('increases chart width when x zoom increases', () => {
    const baseWidth = calculateCycleChartWidth(sampleDates, 320, 1);
    const zoomedWidth = calculateCycleChartWidth(sampleDates, 320, 3);

    expect(zoomedWidth).toBeGreaterThan(baseWidth);
  });

  it('calculates touch distance for a pinch gesture', () => {
    expect(
      calculateTouchDistance(
        { pageX: 10, pageY: 10 },
        { pageX: 40, pageY: 50 },
      ),
    ).toBe(50);
  });

  it('adjusts zoom from pinch scale while clamping to the allowed range', () => {
    expect(getPinchAdjustedZoom(1.5, 2)).toBe(3);
    expect(getPinchAdjustedZoom(1.2, 0.1)).toBe(1);
    expect(getPinchAdjustedZoom(3.5, 2)).toBe(4);
  });
});