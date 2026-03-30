import { describe, expect, it } from '@jest/globals';

import { sanitizeRecordForSync } from './sync-records';

describe('sanitizeRecordForSync', () => {
  it('removes derived cycle compound fields before syncing', () => {
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
    });
  });

  it('leaves collections without special handling unchanged', () => {
    const record = {
      id: 9,
      name: 'Push Day',
      created_at: '2026-03-01T00:00:00.000Z',
    };

    expect(sanitizeRecordForSync('workouts', record)).toEqual(record);
  });
});