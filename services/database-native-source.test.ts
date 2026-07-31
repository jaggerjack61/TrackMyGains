import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readNativeDatabaseSource = () =>
  readFileSync(join(__dirname, 'database.native.ts'), 'utf8');

describe('database.native source', () => {
  it('test_initDatabase_sqlitePragmas_enablesForeignKeys', () => {
    const source = readNativeDatabaseSource();

    expect(source).toContain('PRAGMA foreign_keys = ON;');
  });

  it('test_executeTransaction_asyncWrites_usesExclusiveTransaction', () => {
    const source = readNativeDatabaseSource();

    expect(source).toContain('withExclusiveTransactionAsync');
  });

  it('test_databaseOperations_nativeSqliteWork_isSerialized', () => {
    const source = readNativeDatabaseSource();

    expect(source).toContain('databaseOperationQueue');
    expect(source).toContain('queueDatabaseOperation');
  });

  it('test_initDatabase_createsApksTable_withVersionDate', () => {
    const source = readNativeDatabaseSource();

    expect(source).toContain('CREATE TABLE IF NOT EXISTS apks');
    expect(source).toContain('version_date TEXT NOT NULL');
  });

  it('test_initDatabase_apksTable_noLastModifiedSyncMarker', () => {
    const source = readNativeDatabaseSource();

    expect(source).not.toContain('apks.last_modified');
  });

  it('test_initDatabase_concurrentCall_waitsForInitialization', () => {
    const source = readNativeDatabaseSource();
    const initStart = source.indexOf('export const initDatabase');
    const promiseCheck = source.indexOf('if (initPromise)', initStart);
    const databaseCheck = source.indexOf('if (db) return', initStart);

    expect(promiseCheck).toBeGreaterThan(initStart);
    expect(promiseCheck).toBeLessThan(databaseCheck);
  });

  it('test_initDatabase_hotQueries_haveSupportingIndexes', () => {
    const source = readNativeDatabaseSource();

    expect(source).toContain('idx_workouts_routine_order');
    expect(source).toContain('idx_exercise_logs_exercise_date');
    expect(source).toContain('idx_daily_logs_diet_date');
    expect(source).toContain('idx_cycle_compounds_cycle_start');
  });

  it('test_bulkInsertOrUpdate_usesSingleStatementUpsert', () => {
    const source = readNativeDatabaseSource();
    const bulkInsertSource = source.slice(source.indexOf('export const bulkInsertOrUpdate'));

    expect(bulkInsertSource).toContain('ON CONFLICT(sync_id)');
    expect(bulkInsertSource).not.toContain('SELECT id FROM ${tableName}');
  });

  it('test_reordering_updatesSyncTimestamp', () => {
    const source = readNativeDatabaseSource();

    expect(source).toContain('UPDATE routines SET sort_order = ?, last_modified = CURRENT_TIMESTAMP');
    expect(source).toContain('UPDATE workouts SET sort_order = ?, last_modified = CURRENT_TIMESTAMP');
    expect(source).toContain('UPDATE diets SET sort_order = ?, last_modified = CURRENT_TIMESTAMP');
  });

  it('test_legacyTimestampMigration_doesNotLookNewerThanRemoteData', () => {
    const source = readNativeDatabaseSource();

    expect(source).toContain("SET last_modified = '1970-01-01 00:00:00'");
  });

  it('test_cycleCompoundPull_resolvesPlatformSpecificIdByName', () => {
    const source = readNativeDatabaseSource();
    const bulkInsertSource = source.slice(source.indexOf('export const bulkInsertOrUpdate'));

    expect(bulkInsertSource).toContain('SELECT id, name, type, half_life_hours FROM compounds');
    expect(bulkInsertSource).toContain('INSERT INTO compounds (name, type, half_life_hours)');
    expect(bulkInsertSource).toContain('delete normalizedRecord.half_life_hours');
  });

  it('test_syncSchema_usesStableIdsOutboxAndTombstones', () => {
    const source = readNativeDatabaseSource();

    expect(source).toContain('sync_id TEXT UNIQUE');
    expect(source).toContain('CREATE TABLE IF NOT EXISTS sync_outbox');
    expect(source).toContain('CREATE TABLE IF NOT EXISTS sync_tombstones');
    expect(source).toContain('ON CONFLICT(sync_id)');
  });

  it('test_dailyLogs_enforcesOneCalendarDayPerDiet', () => {
    const source = readNativeDatabaseSource();

    expect(source).toContain('idx_daily_logs_unique_date');
    expect(source).toContain('ON CONFLICT(diet_id, date) DO NOTHING');
    expect(source).toContain('getDailyLogSyncId');
  });
});
