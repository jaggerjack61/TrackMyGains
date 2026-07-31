import { describe, expect, it } from '@jest/globals';

import {
  getDailyLogSyncId,
  getRemoteDocumentId,
  legacySyncId,
  normalizeRemoteRecord,
  sanitizeRecordForSync,
} from './sync-records';

describe('sync record identities', () => {
  it('derives the same daily-log identity from a parent and local date', () => {
    expect(getDailyLogSyncId('uuid:diet/one', '2026-07-31'))
      .toBe('day:uuid%3Adiet%2Fone:2026-07-31');
  });

  it('maps legacy numeric document IDs without creating a duplicate remote path', () => {
    const syncId = legacySyncId('weights', 9);

    expect(syncId).toBe('legacy:weights:9');
    expect(getRemoteDocumentId('weights', syncId)).toBe('9');
  });

  it('normalizes legacy relationship IDs into stable relationship references', () => {
    expect(normalizeRemoteRecord('workouts', '12', {
      routine_id: 4,
      name: 'Push Day',
      date: '2026-03-01T12:00:00.000Z',
      created_at: '2026-03-01T00:00:00.000Z',
      sort_order: 2,
      last_modified: '2026-03-01T00:00:00.000Z',
    })).toMatchObject({
      sync_id: 'legacy:workouts:12',
      routine_sync_id: 'legacy:routines:4',
    });
  });
});

describe('sanitizeRecordForSync', () => {
  it('keeps stable relationship and compound metadata but removes local IDs', () => {
    const result = sanitizeRecordForSync('cycle_compounds', {
      id: 1,
      sync_id: 'uuid:compound-entry',
      cycle_id: 2,
      cycle_sync_id: 'uuid:cycle',
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
      sync_id: 'uuid:compound-entry',
      cycle_sync_id: 'uuid:cycle',
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
});
