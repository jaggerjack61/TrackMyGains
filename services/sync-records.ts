export const SYNC_COLLECTIONS = [
  'weights',
  'routines',
  'workouts',
  'exercises',
  'exercise_logs',
  'diets',
  'daily_logs',
  'meals',
  'cycles',
  'cycle_compounds',
] as const;

export type SyncCollectionName = (typeof SYNC_COLLECTIONS)[number];

export type SyncRecord = Record<string, unknown> & {
  sync_id: string;
  last_modified?: string;
};

export type SyncTombstone = {
  collection_name: SyncCollectionName;
  sync_id: string;
  deleted_at: string;
};

export type SyncOutboxEntry = {
  collection_name: SyncCollectionName;
  sync_id: string;
  operation: 'upsert' | 'delete';
  changed_at: string;
};

/**
 * A local record version that lost an equal-or-newer remote sync conflict.
 * The payload preserves the losing edit (JSON of the sync-shaped record)
 * so it can be recovered or surfaced to the user instead of being lost.
 */
export type SyncConflictRecord = {
  collection_name: SyncCollectionName;
  sync_id: string;
  payload: string;
  lost_at: string;
};

type RelationshipDefinition = {
  localKey: string;
  parentCollection: SyncCollectionName;
  remoteKey: string;
};

export const SYNC_RELATIONSHIPS: Partial<
  Record<SyncCollectionName, RelationshipDefinition>
> = {
  workouts: {
    localKey: 'routine_id',
    parentCollection: 'routines',
    remoteKey: 'routine_sync_id',
  },
  exercises: {
    localKey: 'workout_id',
    parentCollection: 'workouts',
    remoteKey: 'workout_sync_id',
  },
  exercise_logs: {
    localKey: 'exercise_id',
    parentCollection: 'exercises',
    remoteKey: 'exercise_sync_id',
  },
  daily_logs: {
    localKey: 'diet_id',
    parentCollection: 'diets',
    remoteKey: 'diet_sync_id',
  },
  meals: {
    localKey: 'daily_log_id',
    parentCollection: 'daily_logs',
    remoteKey: 'daily_log_sync_id',
  },
  cycle_compounds: {
    localKey: 'cycle_id',
    parentCollection: 'cycles',
    remoteKey: 'cycle_sync_id',
  },
};

const withCreatedAndModified = (...columns: readonly string[]) => [
  'sync_id',
  ...columns,
  'created_at',
  'last_modified',
];

const withModified = (...columns: readonly string[]) => [
  'sync_id',
  ...columns,
  'last_modified',
];

const persistedColumnsByCollection: Record<
  SyncCollectionName,
  readonly string[]
> = {
  weights: withModified('weight', 'date'),
  routines: withCreatedAndModified('name', 'sort_order'),
  workouts: withCreatedAndModified(
    'routine_sync_id',
    'name',
    'date',
    'sort_order',
  ),
  exercises: withCreatedAndModified('workout_sync_id', 'name'),
  exercise_logs: withCreatedAndModified(
    'exercise_sync_id',
    'date',
    'weight',
    'weight_unit',
    'reps',
    'sets',
  ),
  diets: withCreatedAndModified('name', 'sort_order'),
  daily_logs: withCreatedAndModified('diet_sync_id', 'date'),
  meals: withCreatedAndModified(
    'daily_log_sync_id',
    'name',
    'calories',
    'protein',
    'carbs',
    'fats',
  ),
  cycles: withCreatedAndModified('name', 'start_date', 'end_date'),
  cycle_compounds: withCreatedAndModified(
    'cycle_sync_id',
    'name',
    'amount',
    'amount_unit',
    'dosing_period',
    'start_date',
    'end_date',
    'type',
    'half_life_hours',
  ),
};

export const isSyncCollectionName = (
  value: string,
): value is SyncCollectionName =>
  (SYNC_COLLECTIONS as readonly string[]).includes(value);

export const createSyncId = (): string => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return `uuid:${cryptoApi.randomUUID()}`;
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return `uuid:${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
  }

  return `uuid:${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
};

export const legacySyncId = (
  collectionName: SyncCollectionName,
  localId: string | number,
) => `legacy:${collectionName}:${String(localId)}`;

export const getDailyLogSyncId = (dietSyncId: string, date: string) =>
  `day:${encodeURIComponent(dietSyncId)}:${date}`;

export const getRemoteDocumentId = (
  collectionName: SyncCollectionName,
  syncId: string,
) => {
  const legacyPrefix = `legacy:${collectionName}:`;
  return syncId.startsWith(legacyPrefix)
    ? syncId.slice(legacyPrefix.length)
    : syncId;
};

export const getTombstoneDocumentId = (tombstone: SyncTombstone) =>
  `${tombstone.collection_name}--${encodeURIComponent(tombstone.sync_id)}`;

export const sanitizeRecordForSync = <T extends Record<string, unknown>>(
  collectionName: SyncCollectionName,
  record: T,
): T => {
  const sanitizedRecord: Record<string, unknown> = {};

  for (const column of persistedColumnsByCollection[collectionName]) {
    if (column in record) {
      sanitizedRecord[column] = record[column];
    }
  }

  return sanitizedRecord as T;
};

export const normalizeRemoteRecord = (
  collectionName: SyncCollectionName,
  documentId: string,
  data: Record<string, unknown>,
): SyncRecord => {
  const rawSyncId = data.sync_id;
  const syncId = typeof rawSyncId === 'string' && rawSyncId.length > 0
    ? rawSyncId
    : /^\d+$/.test(documentId)
      ? legacySyncId(collectionName, documentId)
      : documentId;
  const normalized: Record<string, unknown> = { ...data, sync_id: syncId };
  const relationship = SYNC_RELATIONSHIPS[collectionName];

  if (
    relationship
    && typeof normalized[relationship.remoteKey] !== 'string'
    && normalized[relationship.localKey] !== undefined
  ) {
    normalized[relationship.remoteKey] = legacySyncId(
      relationship.parentCollection,
      String(normalized[relationship.localKey]),
    );
  }

  return sanitizeRecordForSync(collectionName, normalized) as SyncRecord;
};

export const normalizeTimestamp = (value: unknown): number => {
  if (typeof value !== 'string' || value.length === 0) return 0;
  const timestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? new Date(value.replace(' ', 'T') + 'Z').getTime()
    : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const recordsDiffer = (
  collectionName: SyncCollectionName,
  first: Record<string, unknown>,
  second: Record<string, unknown>,
) => JSON.stringify(sanitizeRecordForSync(collectionName, first))
  !== JSON.stringify(sanitizeRecordForSync(collectionName, second));
