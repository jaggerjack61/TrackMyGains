import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  type FirebaseApp,
  FirebaseError,
  getApps,
  initializeApp,
} from 'firebase/app';
import {
  type Auth,
  getAuth,
  // @ts-expect-error Firebase exposes this in React Native bundles, but its public types lag behind.
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import {
  bulkInsertOrUpdate,
  clearSyncOutboxEntries,
  deleteRecordsBySyncIds,
  getAllDataForSync,
  getLastSyncTimestamp,
  getSyncOutboxEntries,
  getSyncTombstones,
  initDatabase,
  setLastSyncTimestamp,
  upsertSyncTombstones,
} from '@/services/database';
import {
  cascadeTombstonesThroughRemoteRecords,
  deduplicateRemoteDietDays,
  mergeTombstones,
  reconcileCollection,
  tombstoneKey,
} from '@/services/sync-reconciliation';
import {
  SYNC_COLLECTIONS,
  getRemoteDocumentId,
  getTombstoneDocumentId,
  isSyncCollectionName,
  normalizeRemoteRecord,
  sanitizeRecordForSync,
  type SyncCollectionName,
  type SyncOutboxEntry,
  type SyncRecord,
  type SyncTombstone,
} from '@/services/sync-records';

const firebaseConfig = {
  apiKey: 'AIzaSyDYCxW82L-nzn0hJP9vKbO8xf13LL1g0-0',
  authDomain: 'trackmygains-c6056.firebaseapp.com',
  projectId: 'trackmygains-c6056',
  storageBucket: 'trackmygains-c6056.firebasestorage.app',
  messagingSenderId: '562933005382',
  appId: '1:562933005382:android:2def61d4e885dbecc09e47',
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!getApps().length) return initializeApp(firebaseConfig);
  return getApps()[0];
};

let authInstance: Auth | null = null;

export const getFirebaseAuth = () => {
  const app = getFirebaseApp();
  if (authInstance) return authInstance;
  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
    return authInstance;
  }

  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    // Fast refresh can recreate this module after Auth was already initialized.
    authInstance = getAuth(app);
  }
  return authInstance;
};

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const MIN_SYNC_INTERVAL_MS = 30 * 1000;
const MAX_BATCH_SIZE = 400;
const TOMBSTONE_COLLECTION = '_tombstones';

type SyncResult =
  | 'success'
  | 'skipped'
  | 'offline'
  | 'unauthenticated'
  | 'permission-denied'
  | 'busy'
  | 'failed';

type SyncStats = {
  conflicts: number;
  pulled: Record<string, number>;
  pushed: Record<string, number>;
  deleted: number;
};

type SyncOutcome = {
  status: SyncResult;
  stats?: SyncStats;
};

type RemoteCollectionResult = {
  collectionName: SyncCollectionName;
  cursorMillis: number;
  records: SyncRecord[];
  unstampedDocumentIds: string[];
};

type SyncDocument = {
  collectionName: SyncCollectionName;
  documentId: string;
  record: SyncRecord;
};

let syncInterval: ReturnType<typeof setInterval> | null = null;
let syncInProgress = false;
let lastSyncAt = 0;
let appStateSubscription: { remove: () => void } | null = null;
let permissionDeniedAt = 0;

const getCurrentUserId = () => getFirebaseAuth().currentUser?.uid ?? null;

const assertSameAuthenticatedUser = (userId: string) => {
  if (getCurrentUserId() !== userId) {
    throw new Error('Authenticated user changed while syncing');
  }
};

const getLocalRecords = (
  snapshot: Awaited<ReturnType<typeof getAllDataForSync>>,
  collectionName: SyncCollectionName,
): SyncRecord[] => {
  switch (collectionName) {
    case 'weights': return snapshot.weights as SyncRecord[];
    case 'routines': return snapshot.routines as SyncRecord[];
    case 'workouts': return snapshot.workouts as SyncRecord[];
    case 'exercises': return snapshot.exercises as SyncRecord[];
    case 'exercise_logs': return snapshot.exerciseLogs as SyncRecord[];
    case 'diets': return snapshot.diets as SyncRecord[];
    case 'daily_logs': return snapshot.dailyLogs as SyncRecord[];
    case 'meals': return snapshot.meals as SyncRecord[];
    case 'cycles': return snapshot.cycles as SyncRecord[];
    case 'cycle_compounds': return snapshot.cycleCompounds as SyncRecord[];
  }
};

const cursorKey = (userId: string, collectionName: SyncCollectionName) =>
  `remote_cursor:${userId}:${collectionName}`;

const timestampMillis = (value: unknown) =>
  value instanceof Timestamp ? value.toMillis() : 0;

const fetchFirestoreCollection = async (
  firestore: Firestore,
  userId: string,
  collectionName: SyncCollectionName,
  forceFull: boolean,
): Promise<RemoteCollectionResult> => {
  const storedCursor = forceFull
    ? null
    : await getLastSyncTimestamp(cursorKey(userId, collectionName));
  const parsedCursor = Number(storedCursor);
  const cursorMillis = Number.isFinite(parsedCursor) && parsedCursor > 0
    ? parsedCursor
    : 0;
  const collectionRef = collection(
    firestore,
    'users',
    userId,
    collectionName,
  );
  const snapshot = cursorMillis > 0
    ? await getDocs(query(
        collectionRef,
        where('server_modified_at', '>', Timestamp.fromMillis(cursorMillis)),
        orderBy('server_modified_at', 'asc'),
      ))
    : await getDocs(collectionRef);
  let nextCursor = cursorMillis;
  const unstampedDocumentIds: string[] = [];
  const records = snapshot.docs.map(documentSnapshot => {
    const data = documentSnapshot.data();
    const serverModifiedAt = timestampMillis(data.server_modified_at);
    if (serverModifiedAt > nextCursor) nextCursor = serverModifiedAt;
    if (serverModifiedAt === 0) unstampedDocumentIds.push(documentSnapshot.id);
    return normalizeRemoteRecord(
      collectionName,
      documentSnapshot.id,
      data,
    );
  });

  return {
    collectionName,
    cursorMillis: nextCursor,
    records,
    unstampedDocumentIds,
  };
};

const fetchRemoteTombstones = async (
  firestore: Firestore,
  userId: string,
): Promise<SyncTombstone[]> => {
  const snapshot = await getDocs(
    collection(firestore, 'users', userId, TOMBSTONE_COLLECTION),
  );
  const tombstones: SyncTombstone[] = [];
  for (const documentSnapshot of snapshot.docs) {
    const data = documentSnapshot.data();
    if (
      typeof data.collection_name !== 'string'
      || !isSyncCollectionName(data.collection_name)
      || typeof data.sync_id !== 'string'
      || typeof data.deleted_at !== 'string'
    ) continue;
    tombstones.push({
      collection_name: data.collection_name,
      sync_id: data.sync_id,
      deleted_at: data.deleted_at,
    });
  }
  return tombstones;
};

const commitRecordBatches = async (
  firestore: Firestore,
  userId: string,
  documents: SyncDocument[],
) => {
  for (let index = 0; index < documents.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const item of documents.slice(index, index + MAX_BATCH_SIZE)) {
      batch.set(
        doc(
          firestore,
          'users',
          userId,
          item.collectionName,
          item.documentId,
        ),
        {
          ...sanitizeRecordForSync(item.collectionName, item.record),
          server_modified_at: serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
  }
};

const stampLegacyRemoteDocuments = async (
  firestore: Firestore,
  userId: string,
  results: RemoteCollectionResult[],
) => {
  const documents = results.flatMap(result =>
    result.unstampedDocumentIds.map(documentId => ({
      collectionName: result.collectionName,
      documentId,
    })),
  );
  for (let index = 0; index < documents.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const item of documents.slice(index, index + MAX_BATCH_SIZE)) {
      batch.set(
        doc(
          firestore,
          'users',
          userId,
          item.collectionName,
          item.documentId,
        ),
        { server_modified_at: serverTimestamp() },
        { merge: true },
      );
    }
    await batch.commit();
  }
};

const commitTombstones = async (
  firestore: Firestore,
  userId: string,
  tombstones: SyncTombstone[],
) => {
  for (let index = 0; index < tombstones.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const tombstone of tombstones.slice(index, index + MAX_BATCH_SIZE)) {
      batch.set(
        doc(
          firestore,
          'users',
          userId,
          TOMBSTONE_COLLECTION,
          getTombstoneDocumentId(tombstone),
        ),
        { ...tombstone, server_modified_at: serverTimestamp() },
        { merge: true },
      );
    }
    await batch.commit();
  }
};

const deleteTombstonedRemoteRecords = async (
  firestore: Firestore,
  userId: string,
  tombstones: SyncTombstone[],
) => {
  for (let index = 0; index < tombstones.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const tombstone of tombstones.slice(index, index + MAX_BATCH_SIZE)) {
      batch.delete(doc(
        firestore,
        'users',
        userId,
        tombstone.collection_name,
        getRemoteDocumentId(tombstone.collection_name, tombstone.sync_id),
      ));
    }
    await batch.commit();
  }
};

const mergeAndApplyTombstones = async (
  firestore: Firestore,
  userId: string,
  localTombstones: SyncTombstone[],
  remoteTombstones: SyncTombstone[],
  remoteResults: RemoteCollectionResult[],
) => {
  assertSameAuthenticatedUser(userId);
  let merged = mergeTombstones(localTombstones, remoteTombstones);
  await upsertSyncTombstones(merged);
  await deleteRecordsBySyncIds(merged);

  // Parent deletes can create local cascade tombstones. Remote deltas can also
  // contain a concurrently-created child whose parent is already deleted.
  merged = cascadeTombstonesThroughRemoteRecords(
    mergeTombstones(await getSyncTombstones(), remoteTombstones),
    Object.fromEntries(remoteResults.map(result => [
      result.collectionName,
      result.records,
    ])),
  );
  const remoteByKey = new Map(
    remoteTombstones.map(tombstone => [
      tombstoneKey(tombstone.collection_name, tombstone.sync_id),
      tombstone,
    ]),
  );
  const tombstonesToPush = merged.filter(tombstone => {
    const remote = remoteByKey.get(
      tombstoneKey(tombstone.collection_name, tombstone.sync_id),
    );
    return !remote || tombstone.deleted_at > remote.deleted_at;
  });

  await upsertSyncTombstones(merged);
  await deleteRecordsBySyncIds(merged);
  assertSameAuthenticatedUser(userId);
  await commitTombstones(firestore, userId, tombstonesToPush);
  await deleteTombstonedRemoteRecords(firestore, userId, merged);
  return merged;
};

const isOfflineError = (error: unknown) =>
  error instanceof FirebaseError
  && ['unavailable', 'network-request-failed'].includes(error.code);

const recordSyncError = (error: unknown) => {
  if (error instanceof FirebaseError && error.code === 'permission-denied') {
    permissionDeniedAt = Date.now();
  }
};

export const bidirectionalSync = async (options?: {
  force?: boolean;
}): Promise<SyncOutcome> => {
  const force = options?.force ?? false;
  const userId = getCurrentUserId();
  if (!userId) return { status: 'unauthenticated' };
  if (syncInProgress) return { status: 'busy' };
  if (!force && Date.now() - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    return { status: 'skipped' };
  }
  if (
    !force
    && permissionDeniedAt
    && Date.now() - permissionDeniedAt < AUTO_SYNC_INTERVAL_MS
  ) return { status: 'permission-denied' };

  syncInProgress = true;
  try {
    await initDatabase();
    const firestore = getFirestore(getFirebaseApp());
    const localTombstones = await getSyncTombstones();
    const [remoteTombstones, ...remoteResults] = await Promise.all([
      fetchRemoteTombstones(firestore, userId),
      ...SYNC_COLLECTIONS.map(collectionName =>
        fetchFirestoreCollection(firestore, userId, collectionName, force),
      ),
    ]);
    assertSameAuthenticatedUser(userId);

    const dailyLogsResult = (remoteResults as RemoteCollectionResult[])
      .find(result => result.collectionName === 'daily_logs');
    const mealsResult = (remoteResults as RemoteCollectionResult[])
      .find(result => result.collectionName === 'meals');
    const dietDayDeduplication = dailyLogsResult && mealsResult
      ? deduplicateRemoteDietDays(
          dailyLogsResult.records,
          mealsResult.records,
          new Date().toISOString(),
        )
      : null;
    if (dietDayDeduplication) {
      dailyLogsResult!.records = dietDayDeduplication.dailyLogs;
      mealsResult!.records = dietDayDeduplication.meals;
      await commitRecordBatches(
        firestore,
        userId,
        dietDayDeduplication.rewrittenMeals.map(record => ({
          collectionName: 'meals',
          documentId: getRemoteDocumentId('meals', record.sync_id),
          record,
        })),
      );
    }
    assertSameAuthenticatedUser(userId);

    const mergedTombstones = await mergeAndApplyTombstones(
      firestore,
      userId,
      mergeTombstones(
        localTombstones,
        dietDayDeduplication?.tombstones ?? [],
      ),
      remoteTombstones,
      remoteResults as RemoteCollectionResult[],
    );
    const tombstoneKeys = new Set(
      mergedTombstones.map(tombstone =>
        tombstoneKey(tombstone.collection_name, tombstone.sync_id),
      ),
    );
    const localData = await getAllDataForSync();
    const outbox = await getSyncOutboxEntries();
    const deletionEntries = outbox.filter((entry: SyncOutboxEntry) =>
      entry.operation === 'delete',
    );
    const stats: SyncStats = {
      conflicts: 0,
      deleted: deletionEntries.length,
      pulled: {},
      pushed: {},
    };

    for (const result of remoteResults as RemoteCollectionResult[]) {
      assertSameAuthenticatedUser(userId);
      const collectionName = result.collectionName;
      const collectionOutboxEntries = outbox.filter(entry =>
        entry.collection_name === collectionName,
      );
      const pendingEntries = collectionOutboxEntries.filter(entry =>
        entry.operation === 'upsert',
      );
      const pendingSyncIds = new Set(pendingEntries.map(entry => entry.sync_id));
      const tombstonedSyncIds = new Set(
        mergedTombstones
          .filter(tombstone => tombstone.collection_name === collectionName)
          .map(tombstone => tombstone.sync_id),
      );
      const reconciliation = reconcileCollection(
        collectionName,
        getLocalRecords(localData, collectionName),
        result.records.filter(record =>
          !tombstoneKeys.has(tombstoneKey(collectionName, record.sync_id)),
        ),
        pendingSyncIds,
        tombstonedSyncIds,
      );
      const documents = reconciliation.push.map(record => ({
        collectionName,
        documentId: getRemoteDocumentId(collectionName, record.sync_id),
        record,
      }));
      await commitRecordBatches(firestore, userId, documents);
      const pullResult = await bulkInsertOrUpdate(
        collectionName,
        reconciliation.pull,
        collectionOutboxEntries,
      );
      await clearSyncOutboxEntries(pendingEntries);
      stats.conflicts += reconciliation.conflicts;
      stats.pushed[collectionName] = reconciliation.push.length
        + (collectionName === 'meals'
          ? dietDayDeduplication?.rewrittenMeals.length ?? 0
          : 0);
      stats.pulled[collectionName] = pullResult.appliedSyncIds.length;
      if (result.cursorMillis > 0) {
        await setLastSyncTimestamp(
          cursorKey(userId, collectionName),
          String(result.cursorMillis),
        );
      }
    }

    await stampLegacyRemoteDocuments(
      firestore,
      userId,
      remoteResults as RemoteCollectionResult[],
    );
    await clearSyncOutboxEntries(deletionEntries);
    permissionDeniedAt = 0;
    lastSyncAt = Date.now();
    return { status: 'success', stats };
  } catch (error) {
    console.error('[Bidirectional Sync] Sync failed:', error);
    recordSyncError(error);
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      return { status: 'permission-denied' };
    }
    if (isOfflineError(error)) return { status: 'offline' };
    if (!getCurrentUserId()) return { status: 'unauthenticated' };
    return { status: 'failed' };
  } finally {
    syncInProgress = false;
  }
};

export const startFirestoreAutoSync = () => {
  stopFirestoreAutoSync();

  const runSync = () => {
    void bidirectionalSync();
  };
  const startInterval = () => {
    if (!syncInterval) {
      syncInterval = setInterval(runSync, AUTO_SYNC_INTERVAL_MS);
    }
  };
  const stopInterval = () => {
    if (!syncInterval) return;
    clearInterval(syncInterval);
    syncInterval = null;
  };

  if (AppState.currentState === 'active') startInterval();
  appStateSubscription = AppState.addEventListener(
    'change',
    (state: AppStateStatus) => {
      if (state === 'active') {
        startInterval();
        runSync();
      } else {
        stopInterval();
      }
    },
  );
};

export const stopFirestoreAutoSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};
