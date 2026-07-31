import { describe, expect, it } from '@jest/globals';

import {
  cascadeTombstonesThroughRemoteRecords,
  deduplicateRemoteDietDays,
  mergeTombstones,
  reconcileCollection,
} from './sync-reconciliation';
import type { SyncRecord, SyncTombstone } from './sync-records';

const weight = (
  syncId: string,
  value: number,
  modified = '2026-07-31T10:00:00.000Z',
): SyncRecord => ({
  sync_id: syncId,
  weight: value,
  date: '2026-07-31T10:00:00.000Z',
  last_modified: modified,
});

describe('reconcileCollection', () => {
  it('pushes independently created records with distinct stable IDs', () => {
    const result = reconcileCollection(
      'weights',
      [weight('uuid:device-b', 91)],
      [weight('uuid:device-a', 90)],
      new Set(['uuid:device-b']),
      new Set(),
    );

    expect(result.push.map(record => record.sync_id)).toEqual(['uuid:device-b']);
    expect(result.pull.map(record => record.sync_id)).toEqual(['uuid:device-a']);
  });

  it('never pulls a record covered by a tombstone', () => {
    const result = reconcileCollection(
      'weights',
      [],
      [weight('uuid:deleted', 90)],
      new Set(),
      new Set(['uuid:deleted']),
    );

    expect(result.pull).toEqual([]);
  });

  it('uses the remote record as deterministic winner for equal-time conflicts', () => {
    const result = reconcileCollection(
      'weights',
      [weight('uuid:same', 90)],
      [weight('uuid:same', 91)],
      new Set(['uuid:same']),
      new Set(),
    );

    expect(result.conflicts).toBe(1);
    expect(result.pull[0]).toMatchObject({ weight: 91 });
  });
});

describe('mergeTombstones', () => {
  it('keeps the newest deletion marker for each stable ID', () => {
    const oldMarker: SyncTombstone = {
      collection_name: 'weights',
      sync_id: 'uuid:deleted',
      deleted_at: '2026-07-31T10:00:00.000Z',
    };
    const newMarker = {
      ...oldMarker,
      deleted_at: '2026-07-31T11:00:00.000Z',
    };

    expect(mergeTombstones([oldMarker], [newMarker])).toEqual([newMarker]);
  });
});

describe('cascadeTombstonesThroughRemoteRecords', () => {
  it('marks remote descendants whose parent has been deleted', () => {
    const deletedAt = '2026-07-31T11:00:00.000Z';
    const result = cascadeTombstonesThroughRemoteRecords([{
      collection_name: 'routines',
      sync_id: 'uuid:routine',
      deleted_at: deletedAt,
    }], {
      workouts: [{
        sync_id: 'uuid:workout',
        routine_sync_id: 'uuid:routine',
      }],
      exercises: [{
        sync_id: 'uuid:exercise',
        workout_sync_id: 'uuid:workout',
      }],
    });

    expect(result).toEqual(expect.arrayContaining([
      {
        collection_name: 'workouts',
        sync_id: 'uuid:workout',
        deleted_at: deletedAt,
      },
      {
        collection_name: 'exercises',
        sync_id: 'uuid:exercise',
        deleted_at: deletedAt,
      },
    ]));
  });
});

describe('deduplicateRemoteDietDays', () => {
  it('keeps one stable day and rewrites meals before tombstoning duplicates', () => {
    const result = deduplicateRemoteDietDays([
      {
        sync_id: 'uuid:day-b',
        diet_sync_id: 'uuid:diet',
        date: '2026-07-31',
      },
      {
        sync_id: 'uuid:day-a',
        diet_sync_id: 'uuid:diet',
        date: '2026-07-31',
      },
    ], [{
      sync_id: 'uuid:meal',
      daily_log_sync_id: 'uuid:day-b',
    }], '2026-07-31T12:00:00.000Z');

    expect(result.dailyLogs.map(record => record.sync_id)).toEqual(['uuid:day-a']);
    expect(result.meals[0].daily_log_sync_id).toBe('uuid:day-a');
    expect(result.rewrittenMeals).toHaveLength(1);
    expect(result.tombstones).toEqual([{
      collection_name: 'daily_logs',
      sync_id: 'uuid:day-b',
      deleted_at: '2026-07-31T12:00:00.000Z',
    }]);
  });
});
