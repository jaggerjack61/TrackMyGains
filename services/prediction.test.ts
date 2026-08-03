import { describe, expect, it } from '@jest/globals';

import { predictNextLog } from './prediction';

const log = (
  date: string,
  weight: number,
  weight_unit: 'kg' | 'lbs',
  sets: number,
  reps: number
) => ({ date, weight, weight_unit, sets, reps });

describe('predictNextLog', () => {
  it('returns null for no logs', () => {
    expect(predictNextLog([])).toBeNull();
  });

  it('uses the last value when fewer than 3 logs exist', () => {
    const result = predictNextLog([
      log('2026-07-01', 80, 'kg', 3, 10),
      log('2026-07-08', 82.5, 'kg', 3, 10),
    ]);

    expect(result).toEqual({ weight: '82.5', sets: '3', reps: '10', unit: 'kg' });
  });

  it('predicts the next weight from the trend of 3+ logs', () => {
    const result = predictNextLog([
      log('2026-07-01', 80, 'kg', 3, 10),
      log('2026-07-08', 82.5, 'kg', 3, 10),
      log('2026-07-15', 85, 'kg', 3, 10),
    ]);

    expect(result).not.toBeNull();
    expect(result!.weight).toBe('87.5');
    expect(result!.sets).toBe('3');
    expect(result!.reps).toBe('10');
  });

  it('converts mixed units into the most recent log unit', () => {
    const result = predictNextLog([
      log('2026-07-01', 100, 'kg', 3, 10),
      log('2026-07-08', 102.5, 'kg', 3, 10),
      log('2026-07-15', 105, 'kg', 3, 10),
      log('2026-07-22', 240, 'lbs', 3, 10),
    ]);

    expect(result).not.toBeNull();
    expect(result!.unit).toBe('lbs');
    expect(parseFloat(result!.weight)).toBeCloseTo(245.5, 1);
  });

  it('handles flat data without dividing by zero', () => {
    const result = predictNextLog([
      log('2026-07-01', 80, 'kg', 3, 10),
      log('2026-07-08', 80, 'kg', 3, 10),
      log('2026-07-15', 80, 'kg', 3, 10),
    ]);

    expect(result!.weight).toBe('80');
  });

  it('clamps sets and reps to at least 1', () => {
    const result = predictNextLog([
      log('2026-07-01', 80, 'kg', 1, 1),
      log('2026-07-08', 80, 'kg', 1, 1),
      log('2026-07-15', 80, 'kg', 1, 1),
    ]);

    expect(result!.sets).toBe('1');
    expect(result!.reps).toBe('1');
  });
});
