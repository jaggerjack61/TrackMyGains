import { describe, expect, it } from '@jest/globals';
import { calculateCycleLevels } from './cycle-calculations';
import { CycleCompound } from './database';

const makeCompound = (overrides: Partial<CycleCompound> = {}): CycleCompound => ({
  id: 1,
  cycle_id: 1,
  compound_id: 1,
  name: 'Testosterone',
  type: 'injectable',
  amount: 250,
  amount_unit: 'mg',
  dosing_period: 7,
  start_date: '2026-01-01',
  end_date: '2026-01-28',
  half_life_hours: 168,
  created_at: '2026-01-01',
  ...overrides,
});

describe('calculateCycleLevels', () => {
  it('returns one series per compound, not grouped by type', () => {
    const compounds: CycleCompound[] = [
      makeCompound({ id: 1, name: 'Testosterone', type: 'injectable' }),
      makeCompound({ id: 2, name: 'Deca', type: 'injectable' }),
    ];

    const result = calculateCycleLevels(
      compounds,
      new Date('2026-01-01'),
      new Date('2026-01-28')
    );

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Testosterone');
    expect(result[1].name).toBe('Deca');
  });

  it('assigns distinct colors to each compound', () => {
    const compounds: CycleCompound[] = [
      makeCompound({ id: 1, name: 'Testosterone' }),
      makeCompound({ id: 2, name: 'Deca' }),
      makeCompound({ id: 3, name: 'Trenbolone' }),
    ];

    const result = calculateCycleLevels(
      compounds,
      new Date('2026-01-01'),
      new Date('2026-01-28')
    );

    const colors = result.map(s => s.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(3);
  });

  it('returns empty array when no compounds provided', () => {
    const result = calculateCycleLevels(
      [],
      new Date('2026-01-01'),
      new Date('2026-01-28')
    );

    expect(result).toHaveLength(0);
  });

  it('produces data points with positive values during active dosing', () => {
    const compounds: CycleCompound[] = [
      makeCompound({ id: 1, name: 'Testosterone' }),
    ];

    const result = calculateCycleLevels(
      compounds,
      new Date('2026-01-01'),
      new Date('2026-01-28')
    );

    expect(result).toHaveLength(1);
    // Mid-cycle should have non-zero levels
    const midPoint = Math.floor(result[0].data.length / 2);
    expect(result[0].data[midPoint].value).toBeGreaterThan(0);
  });

  it('keeps different types as separate series, not combined', () => {
    const compounds: CycleCompound[] = [
      makeCompound({ id: 1, name: 'Testosterone', type: 'injectable' }),
      makeCompound({ id: 2, name: 'Anavar', type: 'oral' }),
    ];

    const result = calculateCycleLevels(
      compounds,
      new Date('2026-01-01'),
      new Date('2026-01-28')
    );

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Testosterone');
    expect(result[1].name).toBe('Anavar');
  });

  it('accumulates and decays daily doses', () => {
    const result = calculateCycleLevels(
      [makeCompound({ amount: 100, dosing_period: 1, half_life_hours: 24, end_date: '2026-01-02' })],
      new Date('2026-01-01'),
      new Date('2026-01-02')
    );

    expect(result[0].data[0].value).toBeCloseTo(1000);
    expect(result[0].data[1].value).toBeCloseTo(1500);
    expect(result[0].data[2].value).toBeCloseTo(750);
  });

  it.each([0, -1, 0.5, 1.5, Number.POSITIVE_INFINITY])(
    'returns zero levels for an invalid dosing period of %s',
    dosingPeriod => {
      const result = calculateCycleLevels(
        [makeCompound({ dosing_period: dosingPeriod })],
        new Date('2026-01-01'),
        new Date('2026-01-02')
      );

      expect(result[0].data.every(point => point.value === 0)).toBe(true);
    }
  );
});
