import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readFirebaseSource = () =>
  readFileSync(join(__dirname, 'firebase.ts'), 'utf8');

describe('firebase sync source', () => {
  it('uses one local snapshot and a stable-ID outbox', () => {
    const source = readFirebaseSource();

    expect(source).toContain('getAllDataForSync');
    expect(source).toContain('getSyncOutboxEntries');
    expect(source).toContain('record.sync_id');
    expect(source).toContain('getRemoteDocumentId');
  });

  it('fetches independent Firestore collections concurrently', () => {
    const source = readFirebaseSource();
    const bidirectionalSync = source.slice(source.indexOf('export const bidirectionalSync'));

    expect(bidirectionalSync).toContain('await Promise.all([');
  });

  it('uses cursored incremental reads after the initial sync', () => {
    const source = readFirebaseSource();
    const fetchCollection = source.slice(
      source.indexOf('const fetchFirestoreCollection'),
      source.indexOf('const fetchRemoteTombstones'),
    );

    expect(fetchCollection).toContain('getLastSyncTimestamp');
    expect(fetchCollection).toContain("where('server_modified_at', '>',");
    expect(fetchCollection).toContain("orderBy('server_modified_at', 'asc')");
    expect(fetchCollection).not.toContain('catch');
  });

  it('propagates deletions with retained tombstones', () => {
    const source = readFirebaseSource();

    expect(source).toContain("const TOMBSTONE_COLLECTION = '_tombstones'");
    expect(source).toContain('mergeTombstones');
    expect(source).toContain('deleteRecordsBySyncIds');
    expect(source).toContain('deleteTombstonedRemoteRecords');
  });

  it('stops the polling interval while the app is inactive', () => {
    const source = readFirebaseSource();
    const autoSync = source.slice(
      source.indexOf('export const startFirestoreAutoSync'),
      source.indexOf('export const stopFirestoreAutoSync'),
    );

    expect(autoSync).toMatch(/AppState\.currentState === ['"]active['"]/);
    expect(autoSync).toContain('stopInterval()');
    expect(source).toContain('5 * 60 * 1000');
  });

  it('does not reconcile platform-specific compound reference collections', () => {
    const source = readFirebaseSource();

    expect(source).not.toContain("mapDocs('compounds'");
    expect(source).not.toContain("name: 'compounds'");
  });
});
