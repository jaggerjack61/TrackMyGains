import {
  SYNC_COLLECTIONS,
  SYNC_RELATIONSHIPS,
  normalizeTimestamp,
  recordsDiffer,
  type SyncCollectionName,
  type SyncRecord,
  type SyncTombstone,
} from './sync-records';

type RemoteRecordsByCollection = Partial<
  Record<SyncCollectionName, SyncRecord[]>
>;

export type CollectionReconciliation = {
  conflicts: number;
  pull: SyncRecord[];
  push: SyncRecord[];
};

export type RemoteDietDayDeduplication = {
  dailyLogs: SyncRecord[];
  meals: SyncRecord[];
  rewrittenMeals: SyncRecord[];
  tombstones: SyncTombstone[];
};

export const tombstoneKey = (
  collectionName: SyncCollectionName,
  syncId: string,
) => `${collectionName}\0${syncId}`;

export const mergeTombstones = (
  local: SyncTombstone[],
  remote: SyncTombstone[],
) => {
  const merged = new Map<string, SyncTombstone>();
  for (const tombstone of [...local, ...remote]) {
    const key = tombstoneKey(tombstone.collection_name, tombstone.sync_id);
    const existing = merged.get(key);
    if (!existing || tombstone.deleted_at > existing.deleted_at) {
      merged.set(key, tombstone);
    }
  }
  return [...merged.values()];
};

export const cascadeTombstonesThroughRemoteRecords = (
  tombstones: SyncTombstone[],
  remoteRecords: RemoteRecordsByCollection,
) => {
  const expanded = mergeTombstones(tombstones, []);
  const markerByKey = new Map(
    expanded.map(tombstone => [
      tombstoneKey(tombstone.collection_name, tombstone.sync_id),
      tombstone,
    ]),
  );

  for (const collectionName of SYNC_COLLECTIONS) {
    const relationship = SYNC_RELATIONSHIPS[collectionName];
    if (!relationship) continue;

    for (const record of remoteRecords[collectionName] ?? []) {
      const parentSyncId = record[relationship.remoteKey];
      if (typeof parentSyncId !== 'string') continue;
      const parentMarker = markerByKey.get(tombstoneKey(
        relationship.parentCollection,
        parentSyncId,
      ));
      const recordKey = tombstoneKey(collectionName, record.sync_id);
      if (!parentMarker || markerByKey.has(recordKey)) continue;

      const marker: SyncTombstone = {
        collection_name: collectionName,
        sync_id: record.sync_id,
        deleted_at: parentMarker.deleted_at,
      };
      expanded.push(marker);
      markerByKey.set(recordKey, marker);
    }
  }

  return expanded;
};

export const deduplicateRemoteDietDays = (
  dailyLogs: SyncRecord[],
  meals: SyncRecord[],
  deletedAt: string,
): RemoteDietDayDeduplication => {
  const groups = new Map<string, SyncRecord[]>();
  for (const dailyLog of dailyLogs) {
    if (
      typeof dailyLog.diet_sync_id !== 'string'
      || typeof dailyLog.date !== 'string'
    ) continue;
    const key = `${dailyLog.diet_sync_id}\0${dailyLog.date}`;
    const group = groups.get(key) ?? [];
    group.push(dailyLog);
    groups.set(key, group);
  }

  const canonicalByDuplicate = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [canonical, ...duplicates] = [...group]
      .sort((first, second) => first.sync_id.localeCompare(second.sync_id));
    for (const duplicate of duplicates) {
      canonicalByDuplicate.set(duplicate.sync_id, canonical.sync_id);
    }
  }

  const tombstones: SyncTombstone[] = [...canonicalByDuplicate.keys()]
    .map(syncId => ({
      collection_name: 'daily_logs',
      sync_id: syncId,
      deleted_at: deletedAt,
    }));
  const rewrittenMeals: SyncRecord[] = [];
  const normalizedMeals = meals.map(meal => {
    const parentSyncId = typeof meal.daily_log_sync_id === 'string'
      ? meal.daily_log_sync_id
      : '';
    const canonicalSyncId = canonicalByDuplicate.get(parentSyncId);
    if (!canonicalSyncId) return meal;
    const rewritten = { ...meal, daily_log_sync_id: canonicalSyncId };
    rewrittenMeals.push(rewritten);
    return rewritten;
  });

  return {
    dailyLogs: dailyLogs.filter(dailyLog =>
      !canonicalByDuplicate.has(dailyLog.sync_id),
    ),
    meals: normalizedMeals,
    rewrittenMeals,
    tombstones,
  };
};

export const reconcileCollection = (
  collectionName: SyncCollectionName,
  localRecords: SyncRecord[],
  remoteChanges: SyncRecord[],
  pendingSyncIds: ReadonlySet<string>,
  tombstonedSyncIds: ReadonlySet<string>,
): CollectionReconciliation => {
  const localBySyncId = new Map(
    localRecords.map(record => [record.sync_id, record]),
  );
  const remoteBySyncId = new Map(
    remoteChanges.map(record => [record.sync_id, record]),
  );
  const push: SyncRecord[] = [];
  const pull: SyncRecord[] = [];
  let conflicts = 0;

  for (const remoteRecord of remoteChanges) {
    if (tombstonedSyncIds.has(remoteRecord.sync_id)) continue;
    const localRecord = localBySyncId.get(remoteRecord.sync_id);
    if (!localRecord) {
      pull.push(remoteRecord);
      continue;
    }

    if (!pendingSyncIds.has(remoteRecord.sync_id)) {
      if (recordsDiffer(collectionName, localRecord, remoteRecord)) {
        pull.push(remoteRecord);
      }
      continue;
    }

    const localTime = normalizeTimestamp(localRecord.last_modified);
    const remoteTime = normalizeTimestamp(remoteRecord.last_modified);
    if (localTime > remoteTime) {
      push.push(localRecord);
      continue;
    }

    if (recordsDiffer(collectionName, localRecord, remoteRecord)) {
      conflicts += 1;
      pull.push(remoteRecord);
    }
  }

  for (const syncId of pendingSyncIds) {
    if (tombstonedSyncIds.has(syncId) || remoteBySyncId.has(syncId)) continue;
    const localRecord = localBySyncId.get(syncId);
    if (localRecord) push.push(localRecord);
  }

  return { conflicts, pull, push };
};
