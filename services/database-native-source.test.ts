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
});