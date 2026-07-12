import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readFirebaseSource = () =>
  readFileSync(join(__dirname, 'firebase.ts'), 'utf8');

describe('firebase sync source', () => {
  it('collects a fixed-count local snapshot instead of traversing every parent', () => {
    const source = readFirebaseSource();
    const collector = source.slice(
      source.indexOf('const collectLocalData'),
      source.indexOf('const commitBatches'),
    );

    expect(collector).toContain('getAllDataForSync');
    expect(collector).not.toContain('.map(');
  });

  it('fetches independent Firestore collections concurrently', () => {
    const source = readFirebaseSource();
    const bidirectionalSync = source.slice(source.indexOf('export const bidirectionalSync'));

    expect(bidirectionalSync).toContain('await Promise.all([');
  });

  it('propagates Firestore read failures instead of treating them as empty data', () => {
    const source = readFirebaseSource();
    const fetchCollection = source.slice(
      source.indexOf('const fetchFirestoreCollection'),
      source.indexOf('const compareAndSync'),
    );

    expect(fetchCollection).toContain('throw error');
    expect(fetchCollection).not.toContain('return []');
  });

  it('stops the polling interval while the app is inactive', () => {
    const source = readFirebaseSource();
    const autoSync = source.slice(
      source.indexOf('export const startFirestoreAutoSync'),
      source.indexOf('export const stopFirestoreAutoSync'),
    );

    expect(autoSync).toContain('AppState.currentState === "active"');
    expect(autoSync).toContain('stopInterval()');
  });

  it('does not reconcile platform-specific compound reference collections', () => {
    const source = readFirebaseSource();

    expect(source).not.toContain('mapDocs("compounds"');
    expect(source).not.toContain('name: "compounds"');
  });

  it('verifies legacy compound names before using ID-based metadata', () => {
    const source = readFirebaseSource();

    expect(source).toContain('compound && compound.name === record.name');
  });
});
