import { describe, expect, it } from '@jest/globals';

import {
  buildScrollableChartLabels,
  calculateInitialChartScrollOffset,
  calculateScrollableChartWidth,
  DEFAULT_CHART_VISIBLE_DAYS,
} from './chart-timeline';

const buildDates = (count: number) => Array.from(
  { length: count },
  (_, index) => `2026-03-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
);

describe('chart timeline helpers', () => {
  it('keeps one month visible at the viewport width by default', () => {
    expect(calculateScrollableChartWidth(buildDates(DEFAULT_CHART_VISIBLE_DAYS), 320)).toBe(320);
  });

  it('widens longer timelines so the viewport still represents one month', () => {
    const chartWidth = calculateScrollableChartWidth(buildDates(DEFAULT_CHART_VISIBLE_DAYS * 3), 320);

    expect(chartWidth).toBe(960);
  });

  it('does not shrink sparse or short timelines below the viewport width', () => {
    expect(calculateScrollableChartWidth(buildDates(7), 320)).toBe(320);
    expect(calculateScrollableChartWidth([], 320)).toBe(320);
  });

  it('starts scrollable charts at the latest visible range', () => {
    expect(calculateInitialChartScrollOffset(960, 320)).toBe(640);
    expect(calculateInitialChartScrollOffset(320, 320)).toBe(0);
  });

  it('keeps chart labels aligned with data points while limiting visible labels', () => {
    const labels = buildScrollableChartLabels(buildDates(45));

    expect(labels).toHaveLength(45);
    expect(labels[0]).toBe('3/1');
    expect(labels.at(-1)).toBe('4/14');
    expect(labels.filter(Boolean).length).toBeLessThan(12);
  });
});