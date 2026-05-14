import { describe, expect, it } from '@jest/globals';

import {
  buildChartYAxis,
  buildYAxisBoundsDataset,
  formatChartAxisValue,
} from './chart-axis';

describe('chart axis helpers', () => {
  it('builds rounded non-zero y-axis intervals for bodyweight-style data', () => {
    const axis = buildChartYAxis([82.4, 84.8, 86.7]);

    expect(axis.min).toBe(82);
    expect(axis.max).toBe(87);
    expect(axis.step).toBe(1);
    expect(axis.segments).toBe(5);
    expect(axis.labels).toEqual(['82', '83', '84', '85', '86', '87']);
  });

  it('can anchor positive quantity charts at zero with normal intervals', () => {
    const axis = buildChartYAxis([1860, 2140, 2475], { includeZero: true });

    expect(axis.min).toBe(0);
    expect(axis.max).toBe(2500);
    expect(axis.step).toBe(500);
    expect(axis.labels).toEqual(['0', '500', '1000', '1500', '2000', '2500']);
  });

  it('formats axis values without noisy decimals', () => {
    expect(formatChartAxisValue(1200)).toBe('1200');
    expect(formatChartAxisValue(82.5)).toBe('82.5');
    expect(formatChartAxisValue(82.25)).toBe('82.25');
  });

  it('builds an invisible bounds dataset that pins chart-kit scaling', () => {
    const axis = buildChartYAxis([82.4, 86.7]);
    const dataset = buildYAxisBoundsDataset(axis, 4);

    expect(dataset.data).toEqual([82, 82, 82, 87]);
    expect(dataset.withDots).toBe(false);
    expect(dataset.strokeWidth).toBe(0);
    expect(dataset.color?.()).toBe('rgba(0,0,0,0)');
  });
});