import { describe, expect, it } from '@jest/globals';

import { sanitizeRecordForSync } from './sync-records';

describe('sanitizeRecordForSync', () => {
  it('keeps compound metadata needed to resolve cross-platform references', () => {
    const result = sanitizeRecordForSync('cycle_compounds', {
      id: 1,
      cycle_id: 2,
      compound_id: 3,
      name: 'Testosterone Enanthate',
      amount: 250,
      amount_unit: 'mg',
      dosing_period: 7,
      start_date: '2026-03-01',
      end_date: '2026-03-30',
      created_at: '2026-03-01T00:00:00.000Z',
      last_modified: '2026-03-01T00:00:00.000Z',
      type: 'injectable',
      half_life_hours: 108,
    });

    expect(result).toEqual({
      id: 1,
      cycle_id: 2,
      compound_id: 3,
      name: 'Testosterone Enanthate',
      amount: 250,
      amount_unit: 'mg',
      dosing_period: 7,
      start_date: '2026-03-01',
      end_date: '2026-03-30',
      created_at: '2026-03-01T00:00:00.000Z',
      last_modified: '2026-03-01T00:00:00.000Z',
      type: 'injectable',
      half_life_hours: 108,
    });
  });

  it('test_sanitizeRecordForSync_workoutWithTransientField_removesNonPersistedField', () => {
    const result = sanitizeRecordForSync('workouts', {
      id: 9,
      routine_id: 1,
      name: 'Push Day',
      date: '2026-03-01T12:00:00.000Z',
      created_at: '2026-03-01T00:00:00.000Z',
      sort_order: 2,
      last_modified: '2026-03-01T00:00:00.000Z',
      isExpanded: true,
    });

    expect(result).toEqual({
      id: 9,
      routine_id: 1,
      name: 'Push Day',
      date: '2026-03-01T12:00:00.000Z',
      created_at: '2026-03-01T00:00:00.000Z',
      sort_order: 2,
      last_modified: '2026-03-01T00:00:00.000Z',
    });
  });
});
