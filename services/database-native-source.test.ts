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
});