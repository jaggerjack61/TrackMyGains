import {
  SYNC_COLLECTIONS,
  SYNC_RELATIONSHIPS,
  createSyncId,
  getDailyLogSyncId,
  legacySyncId,
  type SyncCollectionName,
  type SyncOutboxEntry,
  type SyncTombstone,
} from './sync-records';

const STORAGE_KEYS = {
  weights: 'trackmygains_weights',
  routines: 'trackmygains_routines',
  workouts: 'trackmygains_workouts',
  exercises: 'trackmygains_exercises',
  exerciseLogs: 'trackmygains_exercise_logs',
  diets: 'trackmygains_diets',
  dailyLogs: 'trackmygains_daily_logs',
  meals: 'trackmygains_meals',
  cycles: 'trackmygains_cycles',
  compounds: 'trackmygains_compounds',
  cycleCompounds: 'trackmygains_cycle_compounds',
  syncMetadata: 'trackmygains_sync_metadata',
  syncOutbox: 'trackmygains_sync_outbox',
  syncTombstones: 'trackmygains_sync_tombstones',
} as const;

const STORAGE_KEY_BY_COLLECTION: Record<SyncCollectionName, string> = {
  weights: STORAGE_KEYS.weights,
  routines: STORAGE_KEYS.routines,
  workouts: STORAGE_KEYS.workouts,
  exercises: STORAGE_KEYS.exercises,
  exercise_logs: STORAGE_KEYS.exerciseLogs,
  diets: STORAGE_KEYS.diets,
  daily_logs: STORAGE_KEYS.dailyLogs,
  meals: STORAGE_KEYS.meals,
  cycles: STORAGE_KEYS.cycles,
  cycle_compounds: STORAGE_KEYS.cycleCompounds,
};

const COLLECTION_BY_STORAGE_KEY = Object.fromEntries(
  Object.entries(STORAGE_KEY_BY_COLLECTION).map(([collectionName, storageKey]) => [
    storageKey,
    collectionName,
  ]),
) as Record<string, SyncCollectionName>;

const loadArray = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T[]) : [];
  } catch (error) {
    console.error('Error loading from localStorage', error);
    throw error;
  }
};

const saveRawArray = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage', e);
    throw e;
  }
};

const mergeOutboxEntry = (
  entries: SyncOutboxEntry[],
  entry: SyncOutboxEntry,
) => {
  const existingIndex = entries.findIndex(existing =>
    existing.collection_name === entry.collection_name
    && existing.sync_id === entry.sync_id,
  );
  if (existingIndex === -1) entries.push(entry);
  else entries[existingIndex] = entry;
};

const mergeTombstone = (
  tombstones: SyncTombstone[],
  tombstone: SyncTombstone,
) => {
  const existingIndex = tombstones.findIndex(existing =>
    existing.collection_name === tombstone.collection_name
    && existing.sync_id === tombstone.sync_id,
  );
  if (existingIndex === -1) tombstones.push(tombstone);
  else if (tombstone.deleted_at > tombstones[existingIndex].deleted_at) {
    tombstones[existingIndex] = tombstone;
  }
};

const ensureRecordSyncId = (
  collectionName: SyncCollectionName,
  record: Record<string, unknown>,
  isExisting: boolean,
) => {
  if (typeof record.sync_id === 'string' && record.sync_id.length > 0) return;
  record.sync_id = isExisting && record.id !== undefined
    ? legacySyncId(collectionName, String(record.id))
    : createSyncId();
};

const saveArray = <T>(
  key: string,
  data: T[],
  options: { trackChanges?: boolean } = {},
) => {
  const collectionName = COLLECTION_BY_STORAGE_KEY[key];
  if (!collectionName) {
    saveRawArray(key, data);
    return;
  }

  const previous = loadArray<Record<string, unknown>>(key);
  const previousIds = new Set(previous.map(record => String(record.id)));
  previous.forEach(record => ensureRecordSyncId(collectionName, record, true));
  const next = data as Record<string, unknown>[];
  next.forEach(record => ensureRecordSyncId(
    collectionName,
    record,
    previousIds.has(String(record.id)),
  ));
  saveRawArray(key, data);

  if (options.trackChanges === false) return;

  const timestamp = nowIso();
  const previousBySyncId = new Map(previous.map(record => [String(record.sync_id), record]));
  const nextBySyncId = new Map(next.map(record => [String(record.sync_id), record]));
  const outbox = loadArray<SyncOutboxEntry>(STORAGE_KEYS.syncOutbox);
  const tombstones = loadArray<SyncTombstone>(STORAGE_KEYS.syncTombstones);

  for (const [syncId, previousRecord] of previousBySyncId) {
    if (nextBySyncId.has(syncId)) continue;
    const deletedAt = timestamp;
    mergeTombstone(tombstones, {
      collection_name: collectionName,
      sync_id: syncId,
      deleted_at: deletedAt,
    });
    mergeOutboxEntry(outbox, {
      collection_name: collectionName,
      sync_id: syncId,
      operation: 'delete',
      changed_at: deletedAt,
    });
    void previousRecord;
  }

  for (const [syncId, nextRecord] of nextBySyncId) {
    const previousRecord = previousBySyncId.get(syncId);
    if (previousRecord && JSON.stringify(previousRecord) === JSON.stringify(nextRecord)) {
      continue;
    }
    mergeOutboxEntry(outbox, {
      collection_name: collectionName,
      sync_id: syncId,
      operation: 'upsert',
      changed_at: timestamp,
    });
  }

  saveRawArray(STORAGE_KEYS.syncTombstones, tombstones);
  saveRawArray(STORAGE_KEYS.syncOutbox, outbox);
};

const nextId = (records: readonly { id?: unknown }[]): number => {
  const currentTimestamp = Date.now();
  const maxExistingId = records.reduce((maxId, record) => {
    const recordId = Number(record.id);
    if (!Number.isFinite(recordId)) return maxId;
    return Math.max(maxId, recordId);
  }, 0);

  return currentTimestamp > maxExistingId ? currentTimestamp : maxExistingId + 1;
};
const nowIso = (): string => new Date().toISOString();
const updateRecord = (record: object, changes: object, timestamp = nowIso()) => {
  Object.assign(record, changes, { last_modified: timestamp });
};

const sortByCreatedAtDesc = (a: { created_at: string }, b: { created_at: string }) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

export const initDatabase = async () => {
  const metadata = loadArray<{ key: string; value: string }>(STORAGE_KEYS.syncMetadata);
  const hasBootstrappedOutbox = metadata.some(item => item.key === '__outbox_schema_v1');
  const outbox = loadArray<SyncOutboxEntry>(STORAGE_KEYS.syncOutbox);
  const tombstones = loadArray<SyncTombstone>(STORAGE_KEYS.syncTombstones);

  for (const collectionName of SYNC_COLLECTIONS) {
    const storageKey = STORAGE_KEY_BY_COLLECTION[collectionName];
    const records = loadArray<Record<string, unknown>>(storageKey);
    let changed = false;
    for (const record of records) {
      if (typeof record.sync_id === 'string' && record.sync_id.length > 0) continue;
      ensureRecordSyncId(collectionName, record, true);
      changed = true;
    }
    if (changed) saveRawArray(storageKey, records);
  }

  const storedDailyLogs = loadArray<{
    id: number;
    sync_id: string;
    diet_id: number;
    date: string;
  }>(STORAGE_KEYS.dailyLogs);
  const dailyLogGroups = new Map<string, typeof storedDailyLogs>();
  for (const dailyLog of storedDailyLogs) {
    const key = `${dailyLog.diet_id}\0${dailyLog.date}`;
    const group = dailyLogGroups.get(key) ?? [];
    group.push(dailyLog);
    dailyLogGroups.set(key, group);
  }
  const canonicalIdByDuplicateId = new Map<number, number>();
  const migrationTimestamp = nowIso();
  for (const group of dailyLogGroups.values()) {
    if (group.length < 2) continue;
    const [canonical, ...duplicates] = [...group]
      .sort((first, second) => first.sync_id.localeCompare(second.sync_id));
    for (const duplicate of duplicates) {
      canonicalIdByDuplicateId.set(duplicate.id, canonical.id);
      mergeTombstone(tombstones, {
        collection_name: 'daily_logs',
        sync_id: duplicate.sync_id,
        deleted_at: migrationTimestamp,
      });
      mergeOutboxEntry(outbox, {
        collection_name: 'daily_logs',
        sync_id: duplicate.sync_id,
        operation: 'delete',
        changed_at: migrationTimestamp,
      });
    }
  }

  if (canonicalIdByDuplicateId.size > 0) {
    saveRawArray(
      STORAGE_KEYS.dailyLogs,
      storedDailyLogs.filter(log => !canonicalIdByDuplicateId.has(log.id)),
    );
    const storedMeals = loadArray<Record<string, unknown> & {
      daily_log_id: number;
      sync_id: string;
    }>(STORAGE_KEYS.meals);
    for (const meal of storedMeals) {
      const canonicalId = canonicalIdByDuplicateId.get(Number(meal.daily_log_id));
      if (canonicalId === undefined) continue;
      meal.daily_log_id = canonicalId;
      mergeOutboxEntry(outbox, {
        collection_name: 'meals',
        sync_id: String(meal.sync_id),
        operation: 'upsert',
        changed_at: migrationTimestamp,
      });
    }
    saveRawArray(STORAGE_KEYS.meals, storedMeals);
    saveRawArray(STORAGE_KEYS.syncTombstones, tombstones);
  }

  if (!hasBootstrappedOutbox) {
    for (const collectionName of SYNC_COLLECTIONS) {
      const records = loadArray<Record<string, unknown>>(
        STORAGE_KEY_BY_COLLECTION[collectionName],
      );
      for (const record of records) {
        mergeOutboxEntry(outbox, {
          collection_name: collectionName,
          sync_id: String(record.sync_id),
          operation: 'upsert',
          changed_at: nowIso(),
        });
      }
    }
    metadata.push({ key: '__outbox_schema_v1', value: '1' });
    saveRawArray(STORAGE_KEYS.syncMetadata, metadata);
  }
  saveRawArray(STORAGE_KEYS.syncOutbox, outbox);
};

const weights = {
  add: async (weight: number, date: string) => {
    const weights = loadArray<{ id: number; weight: number; date: string; last_modified?: string }>(STORAGE_KEYS.weights);
    weights.push({ id: nextId(weights), weight, date, last_modified: nowIso() });
    saveArray(STORAGE_KEYS.weights, weights);
  },
  list: async () => {
    return loadArray<{ id: number; weight: number; date: string }>(STORAGE_KEYS.weights).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },
  remove: async (id: number) => {
    const weights = loadArray<{ id: number }>(STORAGE_KEYS.weights);
    saveArray(
      STORAGE_KEYS.weights,
      weights.filter(w => w.id !== id)
    );
  },
};

export const addWeight = weights.add;
export const getWeights = weights.list;
export const deleteWeight = weights.remove;

const routines = {
  list: async () => {
    return loadArray<{ id: number; created_at: string; sort_order?: number }>(STORAGE_KEYS.routines).sort((a, b) => {
      const aOrder = a.sort_order ?? 0;
      const bOrder = b.sort_order ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return sortByCreatedAtDesc(a, b);
    });
  },
  add: async (name: string) => {
    const routines = loadArray<{ id: number; name: string; created_at: string; sort_order?: number; last_modified?: string }>(STORAGE_KEYS.routines);
    const maxOrder = routines.reduce((max, r) => Math.max(max, r.sort_order ?? 0), 0);
    const timestamp = nowIso();
    routines.push({ id: nextId(routines), name, created_at: timestamp, sort_order: maxOrder + 1, last_modified: timestamp });
    saveArray(STORAGE_KEYS.routines, routines);
  },
  remove: async (id: number) => {
    const routines = loadArray<{ id: number }>(STORAGE_KEYS.routines);
    saveArray(
      STORAGE_KEYS.routines,
      routines.filter(r => r.id !== id)
    );

    const workouts = loadArray<{ id: number; routine_id: number }>(STORAGE_KEYS.workouts);
    const workoutsToDelete = workouts.filter(w => w.routine_id === id);
    saveArray(
      STORAGE_KEYS.workouts,
      workouts.filter(w => w.routine_id !== id)
    );

    const exercises = loadArray<{ id: number; workout_id: number }>(STORAGE_KEYS.exercises);
    const workoutIds = new Set(workoutsToDelete.map(w => w.id));
    const exerciseIds = new Set(
      exercises.filter(e => workoutIds.has(e.workout_id)).map(e => e.id),
    );
    saveArray(
      STORAGE_KEYS.exercises,
      exercises.filter(e => !workoutIds.has(e.workout_id))
    );

    const logs = loadArray<{ id: number; exercise_id: number }>(STORAGE_KEYS.exerciseLogs);
    saveArray(
      STORAGE_KEYS.exerciseLogs,
      logs.filter(log => !exerciseIds.has(log.exercise_id)),
    );
  },
  updateOrder: async (routines: { id: number; sort_order: number }[]) => {
    const allRoutines = loadArray<{ id: number; sort_order?: number }>(STORAGE_KEYS.routines);
    const routineMap = new Map(allRoutines.map(r => [r.id, r]));

    const timestamp = nowIso();
    for (let index = 0; index < routines.length; index++) {
      const routine = routines[index];
      const existing = routineMap.get(routine.id);
      if (existing) updateRecord(existing, { sort_order: index }, timestamp);
    }

    saveArray(STORAGE_KEYS.routines, Array.from(routineMap.values()));
  },
  update: async (id: number, name: string) => {
    const routines = loadArray<{ id: number; name: string }>(STORAGE_KEYS.routines);
    const index = routines.findIndex(r => r.id === id);
    if (index === -1) return;
    updateRecord(routines[index], { name });
    saveArray(STORAGE_KEYS.routines, routines);
  },
};

export const getRoutines = routines.list;
export const addRoutine = routines.add;
export const deleteRoutine = routines.remove;
export const updateRoutineOrder = routines.updateOrder;
export const updateRoutine = routines.update;

const workouts = {
  list: async (routineId: number) => {
    return loadArray<{ id: number; routine_id: number; name: string; date: string; created_at: string; sort_order?: number }>(
      STORAGE_KEYS.workouts
    )
      .filter(w => w.routine_id === routineId)
      .sort((a, b) => {
        const aOrder = a.sort_order ?? 0;
        const bOrder = b.sort_order ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return sortByCreatedAtDesc(a, b);
      });
  },
  add: async (routineId: number, name: string) => {
    const workouts = loadArray<{ id: number; routine_id: number; name: string; date: string; created_at: string; sort_order?: number; last_modified?: string }>(
      STORAGE_KEYS.workouts
    );
    const routineWorkouts = workouts.filter(w => w.routine_id === routineId);
    const maxOrder = routineWorkouts.reduce((max, w) => Math.max(max, w.sort_order ?? 0), 0);

    const timestamp = nowIso();
    workouts.push({
      id: nextId(workouts),
      routine_id: routineId,
      name,
      date: timestamp,
      created_at: timestamp,
      sort_order: maxOrder + 1,
      last_modified: timestamp,
    });

    saveArray(STORAGE_KEYS.workouts, workouts);
  },
  remove: async (id: number) => {
    const workouts = loadArray<{ id: number }>(STORAGE_KEYS.workouts);
    saveArray(
      STORAGE_KEYS.workouts,
      workouts.filter(w => w.id !== id)
    );

    const exercises = loadArray<{ id: number; workout_id: number }>(STORAGE_KEYS.exercises);
    const exerciseIds = new Set(
      exercises.filter(e => e.workout_id === id).map(e => e.id),
    );
    saveArray(
      STORAGE_KEYS.exercises,
      exercises.filter(e => e.workout_id !== id)
    );

    const logs = loadArray<{ id: number; exercise_id: number }>(STORAGE_KEYS.exerciseLogs);
    saveArray(
      STORAGE_KEYS.exerciseLogs,
      logs.filter(log => !exerciseIds.has(log.exercise_id)),
    );
  },
  updateOrder: async (workouts: { id: number; sort_order: number }[]) => {
    const allWorkouts = loadArray<{ id: number; sort_order?: number }>(STORAGE_KEYS.workouts);
    const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));

    const timestamp = nowIso();
    for (let index = 0; index < workouts.length; index++) {
      const workout = workouts[index];
      const existing = workoutMap.get(workout.id);
      if (existing) updateRecord(existing, { sort_order: index }, timestamp);
    }

    saveArray(STORAGE_KEYS.workouts, Array.from(workoutMap.values()));
  },
  update: async (id: number, name: string) => {
    const workouts = loadArray<{ id: number; name: string }>(STORAGE_KEYS.workouts);
    const index = workouts.findIndex(w => w.id === id);
    if (index === -1) return;
    updateRecord(workouts[index], { name });
    saveArray(STORAGE_KEYS.workouts, workouts);
  },
};

export const getWorkouts = workouts.list;
export const addWorkout = workouts.add;
export const deleteWorkout = workouts.remove;
export const updateWorkoutOrder = workouts.updateOrder;
export const updateWorkout = workouts.update;

const exercises = {
  list: async (workoutId: number) => {
    return loadArray<{ id: number; workout_id: number; created_at: string }>(STORAGE_KEYS.exercises)
      .filter(e => e.workout_id === workoutId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },
  add: async (workoutId: number, name: string) => {
    const exercises = loadArray<{ id: number; workout_id: number; name: string; created_at: string; last_modified?: string }>(STORAGE_KEYS.exercises);
    const timestamp = nowIso();
    exercises.push({ id: nextId(exercises), workout_id: workoutId, name, created_at: timestamp, last_modified: timestamp });
    saveArray(STORAGE_KEYS.exercises, exercises);
  },
  remove: async (id: number) => {
    const exercises = loadArray<{ id: number }>(STORAGE_KEYS.exercises);
    saveArray(
      STORAGE_KEYS.exercises,
      exercises.filter(e => e.id !== id)
    );

    const logs = loadArray<{ id: number; exercise_id: number }>(STORAGE_KEYS.exerciseLogs);
    saveArray(
      STORAGE_KEYS.exerciseLogs,
      logs.filter(l => l.exercise_id !== id)
    );
  },
  update: async (id: number, name: string) => {
    const exercises = loadArray<{ id: number; name: string }>(STORAGE_KEYS.exercises);
    const index = exercises.findIndex(e => e.id === id);
    if (index === -1) return;
    updateRecord(exercises[index], { name });
    saveArray(STORAGE_KEYS.exercises, exercises);
  },
};

export const getExercises = exercises.list;
export const addExercise = exercises.add;
export const deleteExercise = exercises.remove;
export const updateExercise = exercises.update;

const exerciseLogs = {
  list: async (exerciseId: number) => {
    return loadArray<{ id: number; exercise_id: number; date: string }>(STORAGE_KEYS.exerciseLogs)
      .filter(l => l.exercise_id === exerciseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  add: async (exerciseId: number, date: string, weight: number, weightUnit: 'kg' | 'lbs', reps: number, sets: number) => {
    const logs = loadArray<any>(STORAGE_KEYS.exerciseLogs);
    const timestamp = nowIso();
    logs.push({
      id: nextId(logs),
      exercise_id: exerciseId,
      date,
      weight,
      weight_unit: weightUnit,
      reps,
      sets,
      created_at: timestamp,
      last_modified: timestamp,
    });
    saveArray(STORAGE_KEYS.exerciseLogs, logs);
  },
  remove: async (id: number) => {
    const logs = loadArray<{ id: number }>(STORAGE_KEYS.exerciseLogs);
    saveArray(
      STORAGE_KEYS.exerciseLogs,
      logs.filter(l => l.id !== id)
    );
  },
  update: async (id: number, date: string, weight: number, weightUnit: 'kg' | 'lbs', reps: number, sets: number) => {
    const logs = loadArray<any>(STORAGE_KEYS.exerciseLogs);
    const index = logs.findIndex((l: any) => l.id === id);
    if (index === -1) return;
    updateRecord(logs[index], { date, weight, weight_unit: weightUnit, reps, sets });
    saveArray(STORAGE_KEYS.exerciseLogs, logs);
  },
};

export const getExerciseLogs = exerciseLogs.list;
export const addExerciseLog = exerciseLogs.add;
export const deleteExerciseLog = exerciseLogs.remove;
export const updateExerciseLog = exerciseLogs.update;

const diets = {
  list: async () => {
    return loadArray<{ id: number; name: string; created_at: string; sort_order?: number }>(STORAGE_KEYS.diets).sort((a, b) => {
      const aOrder = a.sort_order ?? 0;
      const bOrder = b.sort_order ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return sortByCreatedAtDesc(a, b);
    });
  },
  add: async (name: string) => {
    const diets = loadArray<{ id: number; name: string; created_at: string; sort_order?: number; last_modified?: string }>(STORAGE_KEYS.diets);
    const maxOrder = diets.reduce((max, d) => Math.max(max, d.sort_order ?? 0), 0);
    const timestamp = nowIso();
    diets.push({ id: nextId(diets), name, created_at: timestamp, sort_order: maxOrder + 1, last_modified: timestamp });
    saveArray(STORAGE_KEYS.diets, diets);
  },
  remove: async (id: number) => {
    const diets = loadArray<{ id: number }>(STORAGE_KEYS.diets);
    saveArray(
      STORAGE_KEYS.diets,
      diets.filter(d => d.id !== id)
    );

    const dailyLogs = loadArray<{ id: number; diet_id: number }>(STORAGE_KEYS.dailyLogs);
    const dailyLogsToDelete = dailyLogs.filter(l => l.diet_id === id);
    saveArray(
      STORAGE_KEYS.dailyLogs,
      dailyLogs.filter(l => l.diet_id !== id)
    );

    const meals = loadArray<{ id: number; daily_log_id: number }>(STORAGE_KEYS.meals);
    const dailyLogIds = new Set(dailyLogsToDelete.map(l => l.id));
    saveArray(
      STORAGE_KEYS.meals,
      meals.filter(m => !dailyLogIds.has(m.daily_log_id))
    );
  },
  updateOrder: async (diets: { id: number; sort_order: number }[]) => {
    const allDiets = loadArray<{ id: number; sort_order?: number }>(STORAGE_KEYS.diets);
    const dietMap = new Map(allDiets.map(d => [d.id, d]));

    const timestamp = nowIso();
    for (let index = 0; index < diets.length; index++) {
      const diet = diets[index];
      const existing = dietMap.get(diet.id);
      if (existing) updateRecord(existing, { sort_order: index }, timestamp);
    }

    saveArray(STORAGE_KEYS.diets, Array.from(dietMap.values()));
  },
  update: async (id: number, name: string) => {
    const diets = loadArray<{ id: number; name: string }>(STORAGE_KEYS.diets);
    const index = diets.findIndex(d => d.id === id);
    if (index === -1) return;
    updateRecord(diets[index], { name });
    saveArray(STORAGE_KEYS.diets, diets);
  },
};

export const getDiets = diets.list;
export const addDiet = diets.add;
export const deleteDiet = diets.remove;
export const updateDietOrder = diets.updateOrder;
export const updateDiet = diets.update;

const dailyLogs = {
  list: async (dietId: number) => {
    return loadArray<{ id: number; diet_id: number; date: string }>(STORAGE_KEYS.dailyLogs)
      .filter(l => l.diet_id === dietId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  getByDate: async (dietId: number, date: string) => {
    const logs = loadArray<{ id: number; diet_id: number; date: string }>(STORAGE_KEYS.dailyLogs);
    return logs.find(l => l.diet_id === dietId && l.date === date) || null;
  },
  add: async (dietId: number, date: string) => {
    const logs = loadArray<any>(STORAGE_KEYS.dailyLogs);
    const existing = logs.find(log => log.diet_id === dietId && log.date === date);
    if (existing) return existing.id;
    const diet = loadArray<{ id: number; sync_id?: string }>(STORAGE_KEYS.diets)
      .find(record => record.id === dietId);
    if (!diet?.sync_id) throw new Error('Diet not found');
    const id = nextId(logs);
    const timestamp = nowIso();
    logs.push({
      id,
      sync_id: getDailyLogSyncId(diet.sync_id, date),
      diet_id: dietId,
      date,
      created_at: timestamp,
      last_modified: timestamp,
    });
    saveArray(STORAGE_KEYS.dailyLogs, logs);
    return id;
  },
  remove: async (id: number) => {
    const logs = loadArray<{ id: number }>(STORAGE_KEYS.dailyLogs);
    saveArray(
      STORAGE_KEYS.dailyLogs,
      logs.filter(l => l.id !== id)
    );

    const meals = loadArray<{ id: number; daily_log_id: number }>(STORAGE_KEYS.meals);
    saveArray(
      STORAGE_KEYS.meals,
      meals.filter(m => m.daily_log_id !== id)
    );
  },
};

export const getDailyLogs = dailyLogs.list;
export const getDailyLogsWithStats = async (dietId: number) => {
  const logs = await dailyLogs.list(dietId);
  const allMeals = loadArray<any>(STORAGE_KEYS.meals);
  const totalsByLog = new Map<number, {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }>();

  for (const meal of allMeals) {
    const totals = totalsByLog.get(meal.daily_log_id) ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    };
    totals.calories += Number(meal.calories) || 0;
    totals.protein += Number(meal.protein) || 0;
    totals.carbs += Number(meal.carbs) || 0;
    totals.fats += Number(meal.fats) || 0;
    totalsByLog.set(meal.daily_log_id, totals);
  }

  return logs.map(log => {
    const totals = totalsByLog.get(log.id) ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    };
    return {
      ...log,
      total_calories: totals.calories,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fats: totals.fats,
    };
  });
};
export const getDailyLogByDate = dailyLogs.getByDate;
export const addDailyLog = dailyLogs.add;
export const deleteDailyLog = dailyLogs.remove;

const meals = {
  list: async (dailyLogId: number) => {
    return loadArray<{ id: number; daily_log_id: number; created_at: string }>(STORAGE_KEYS.meals)
      .filter(m => m.daily_log_id === dailyLogId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },
  add: async (dailyLogId: number, name: string, calories: number, protein: number, carbs: number, fats: number) => {
    const meals = loadArray<any>(STORAGE_KEYS.meals);
    const timestamp = nowIso();
    meals.push({ id: nextId(meals), daily_log_id: dailyLogId, name, calories, protein, carbs, fats, created_at: timestamp, last_modified: timestamp });
    saveArray(STORAGE_KEYS.meals, meals);
  },
  remove: async (id: number) => {
    const meals = loadArray<{ id: number }>(STORAGE_KEYS.meals);
    saveArray(
      STORAGE_KEYS.meals,
      meals.filter(m => m.id !== id)
    );
  },
  update: async (id: number, name: string, calories: number, protein: number, carbs: number, fats: number) => {
    const meals = loadArray<any>(STORAGE_KEYS.meals);
    const index = meals.findIndex((m: any) => m.id === id);
    if (index === -1) return;
    updateRecord(meals[index], { name, calories, protein, carbs, fats });
    saveArray(STORAGE_KEYS.meals, meals);
  },
  getRecent: async (query: string) => {
    const meals = loadArray<any>(STORAGE_KEYS.meals);
    const matchedMeals = meals.filter((m: any) => m.name?.toLowerCase?.().includes(query.toLowerCase()));

    const uniqueMeals = new Map<string, any>();
    for (const meal of matchedMeals) {
      const existing = uniqueMeals.get(meal.name);
      if (!existing) {
        uniqueMeals.set(meal.name, meal);
        continue;
      }

      if (new Date(meal.created_at) > new Date(existing.created_at)) {
        uniqueMeals.set(meal.name, meal);
      }
    }

    return Array.from(uniqueMeals.values())
      .sort(sortByCreatedAtDesc)
      .slice(0, 5);
  },
};

export const getMeals = meals.list;
export const addMeal = meals.add;
export const deleteMeal = meals.remove;
export const updateMeal = meals.update;
export const getRecentMeals = meals.getRecent;

const cycles = {
  list: async () => {
    return loadArray<{ id: number; start_date: string }>(STORAGE_KEYS.cycles).sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  },
  get: async (id: number) => {
    const cycles = loadArray<{ id: number }>(STORAGE_KEYS.cycles);
    return cycles.find(c => c.id === id) || null;
  },
  add: async (name: string, startDate: string, endDate: string) => {
    const cycles = loadArray<any>(STORAGE_KEYS.cycles);
    const timestamp = nowIso();
    cycles.push({ id: nextId(cycles), name, start_date: startDate, end_date: endDate, created_at: timestamp, last_modified: timestamp });
    saveArray(STORAGE_KEYS.cycles, cycles);
  },
  remove: async (id: number) => {
    const cycles = loadArray<{ id: number }>(STORAGE_KEYS.cycles);
    saveArray(
      STORAGE_KEYS.cycles,
      cycles.filter(c => c.id !== id)
    );

    const cycleCompounds = loadArray<{ id: number; cycle_id: number }>(STORAGE_KEYS.cycleCompounds);
    saveArray(
      STORAGE_KEYS.cycleCompounds,
      cycleCompounds.filter(cc => cc.cycle_id !== id)
    );
  },
};

export const getCycles = cycles.list;
export const getCycle = cycles.get;
export const addCycle = cycles.add;
export const deleteCycle = cycles.remove;

const defaultCompounds = [
  { id: 1, name: 'Testosterone Enanthate', type: 'injectable', half_life_hours: 108 },
  { id: 2, name: 'Testosterone Cypionate', type: 'injectable', half_life_hours: 120 },
  { id: 3, name: 'Testosterone Propionate', type: 'injectable', half_life_hours: 19 },
  { id: 24, name: 'Testosterone Phenylpropionate', type: 'injectable', half_life_hours: 72 },
  { id: 25, name: 'Testosterone Isocaproate', type: 'injectable', half_life_hours: 216 },
  { id: 26, name: 'Testosterone Decanoate', type: 'injectable', half_life_hours: 312 },
  { id: 27, name: 'Testosterone Undecanoate', type: 'injectable', half_life_hours: 480 },
  { id: 28, name: 'Sustanon (Testosterone Blend)', type: 'injectable', half_life_hours: 168 },
  { id: 29, name: 'Testosterone Suspension', type: 'injectable', half_life_hours: 1 },
  { id: 4, name: 'Nandrolone Decanoate (Deca)', type: 'injectable', half_life_hours: 144 },
  { id: 5, name: 'Nandrolone Phenylpropionate (NPP)', type: 'injectable', half_life_hours: 27 },
  { id: 30, name: 'Nandrolone Undecanoate', type: 'injectable', half_life_hours: 360 },
  { id: 6, name: 'Trenbolone Acetate', type: 'injectable', half_life_hours: 24 },
  { id: 7, name: 'Trenbolone Enanthate', type: 'injectable', half_life_hours: 120 },
  { id: 31, name: 'Trenbolone Hexahydrobenzylcarbonate (Parabolan)', type: 'injectable', half_life_hours: 168 },
  { id: 8, name: 'Boldenone Undecylenate (Equipoise)', type: 'injectable', half_life_hours: 336 },
  { id: 32, name: 'Boldenone Cypionate', type: 'injectable', half_life_hours: 192 },
  { id: 9, name: 'Drostanolone Propionate (Masteron)', type: 'injectable', half_life_hours: 19 },
  { id: 10, name: 'Drostanolone Enanthate (Masteron E)', type: 'injectable', half_life_hours: 120 },
  { id: 11, name: 'Methenolone Enanthate (Primobolan)', type: 'injectable', half_life_hours: 120 },
  { id: 33, name: 'Methenolone Acetate (Primobolan)', type: 'injectable', half_life_hours: 48 },
  { id: 34, name: 'Stanozolol (Injectable)', type: 'injectable', half_life_hours: 24 },
  { id: 12, name: 'Methandienone (Dianabol)', type: 'oral', half_life_hours: 4.5 },
  { id: 13, name: 'Oxandrolone (Anavar)', type: 'oral', half_life_hours: 9 },
  { id: 14, name: 'Stanozolol (Winstrol)', type: 'oral', half_life_hours: 9 },
  { id: 15, name: 'Oxymetholone (Anadrol)', type: 'oral', half_life_hours: 8.5 },
  { id: 16, name: 'Turinabol', type: 'oral', half_life_hours: 16 },
  { id: 35, name: 'Methenolone Acetate (Primobolan Oral)', type: 'oral', half_life_hours: 6 },
  { id: 36, name: 'Mesterolone (Proviron)', type: 'oral', half_life_hours: 12 },
  { id: 37, name: 'Fluoxymesterone (Halotestin)', type: 'oral', half_life_hours: 9 },
  { id: 38, name: 'Methyldrostanolone (Superdrol)', type: 'oral', half_life_hours: 8 },
  { id: 17, name: 'HGH (Human Growth Hormone)', type: 'peptide', half_life_hours: 3 },
  { id: 18, name: 'BPC-157', type: 'peptide', half_life_hours: 4 },
  { id: 19, name: 'TB-500', type: 'peptide', half_life_hours: 24 },
  { id: 20, name: 'Ipamorelin', type: 'peptide', half_life_hours: 2 },
  { id: 21, name: 'CJC-1295 (DAC)', type: 'peptide', half_life_hours: 144 },
  { id: 22, name: 'CJC-1295 (No DAC)', type: 'peptide', half_life_hours: 0.5 },
  { id: 23, name: 'HCG', type: 'peptide', half_life_hours: 36 },
  { id: 39, name: 'Semaglutide', type: 'peptide', half_life_hours: 168 },
  { id: 40, name: 'Tirzepatide', type: 'peptide', half_life_hours: 120 },
  { id: 41, name: 'Liraglutide', type: 'peptide', half_life_hours: 13 },
  { id: 42, name: 'Tesamorelin', type: 'peptide', half_life_hours: 2 },
  { id: 43, name: 'Sermorelin', type: 'peptide', half_life_hours: 0.5 },
  { id: 44, name: 'GHRP-2', type: 'peptide', half_life_hours: 0.5 },
  { id: 45, name: 'GHRP-6', type: 'peptide', half_life_hours: 0.5 },
  { id: 46, name: 'Hexarelin', type: 'peptide', half_life_hours: 0.5 },
  { id: 47, name: 'IGF-1 LR3', type: 'peptide', half_life_hours: 20 },
  { id: 48, name: 'Melanotan II', type: 'peptide', half_life_hours: 36 },
  { id: 49, name: 'PT-141 (Bremelanotide)', type: 'peptide', half_life_hours: 12 },
  { id: 50, name: 'Thymosin Alpha-1', type: 'peptide', half_life_hours: 2 },
  { id: 51, name: 'Epitalon', type: 'peptide', half_life_hours: 1 },
  { id: 52, name: 'AOD-9604', type: 'peptide', half_life_hours: 8 },
];

const compounds = {
  list: async () => {
    let compounds = loadArray<any>(STORAGE_KEYS.compounds);
    if (compounds.length === 0) {
      const timestamp = nowIso();
      compounds = defaultCompounds.map(compound => ({
        ...compound,
        created_at: timestamp,
        last_modified: timestamp,
      }));
      saveArray(STORAGE_KEYS.compounds, compounds);
    } else {
      const existingNames = new Set(compounds.map((c: any) => String(c.name)));
      let nextId = compounds.reduce((max: number, c: any) => Math.max(max, Number(c.id) || 0), 0) + 1;
      const timestamp = nowIso();
      let changed = false;

      for (const compound of compounds) {
        if (!compound.created_at) {
          compound.created_at = timestamp;
          changed = true;
        }
        if (!compound.last_modified) {
          compound.last_modified = compound.created_at;
          changed = true;
        }
      }

      for (const compound of defaultCompounds) {
        if (existingNames.has(compound.name)) continue;
        compounds.push({ ...compound, id: nextId++, created_at: timestamp, last_modified: timestamp });
        changed = true;
      }

      if (changed) saveArray(STORAGE_KEYS.compounds, compounds);
    }
    return compounds.sort((a: any, b: any) => a.name.localeCompare(b.name));
  },
  add: async (name: string, type: 'injectable' | 'oral' | 'peptide', halfLifeHours: number) => {
    const compounds = loadArray<any>(STORAGE_KEYS.compounds);
    const timestamp = nowIso();
    compounds.push({ id: nextId(compounds), name, type, half_life_hours: halfLifeHours, created_at: timestamp, last_modified: timestamp });
    saveArray(STORAGE_KEYS.compounds, compounds);
  },
};

export const getCompounds = compounds.list;
export const addCompound = compounds.add;

const cycleCompounds = {
  list: async (cycleId: number) => {
    const cycleCompounds = loadArray<any>(STORAGE_KEYS.cycleCompounds);
    const compounds = await getCompounds();
    const compoundMap = new Map(compounds.map((c: any) => [c.id, c]));

    return cycleCompounds
      .filter((cc: any) => cc.cycle_id === cycleId)
      .map((cc: any) => ({
        ...cc,
        half_life_hours: compoundMap.get(cc.compound_id)?.half_life_hours || 24,
        type: compoundMap.get(cc.compound_id)?.type || 'injectable',
      }))
      .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  },
  add: async (
    cycleId: number,
    compoundId: number,
    name: string,
    amount: number,
    amountUnit: 'mg' | 'iu' | 'mcg',
    dosingPeriod: number,
    startDate: string,
    endDate: string
  ) => {
    const cycleCompounds = loadArray<any>(STORAGE_KEYS.cycleCompounds);
    const timestamp = nowIso();
    cycleCompounds.push({
      id: nextId(cycleCompounds),
      cycle_id: cycleId,
      compound_id: compoundId,
      name,
      amount,
      amount_unit: amountUnit,
      dosing_period: dosingPeriod,
      start_date: startDate,
      end_date: endDate,
      created_at: timestamp,
      last_modified: timestamp,
    });
    saveArray(STORAGE_KEYS.cycleCompounds, cycleCompounds);
  },
  remove: async (id: number) => {
    const cycleCompounds = loadArray<{ id: number }>(STORAGE_KEYS.cycleCompounds);
    saveArray(
      STORAGE_KEYS.cycleCompounds,
      cycleCompounds.filter(cc => cc.id !== id)
    );
  },
};

export const getCycleCompounds = cycleCompounds.list;
export const addCycleCompound = cycleCompounds.add;
export const deleteCycleCompound = cycleCompounds.remove;

export const getAllDataForSync = async () => {
  await initDatabase();
  const compounds = await getCompounds();
  const compoundsById = new Map(compounds.map(compound => [compound.id, compound]));
  const routines = loadArray<any>(STORAGE_KEYS.routines);
  const workouts = loadArray<any>(STORAGE_KEYS.workouts);
  const exercises = loadArray<any>(STORAGE_KEYS.exercises);
  const diets = loadArray<any>(STORAGE_KEYS.diets);
  const dailyLogs = loadArray<any>(STORAGE_KEYS.dailyLogs);
  const cycles = loadArray<any>(STORAGE_KEYS.cycles);
  const routineSyncIds = new Map(routines.map(record => [record.id, record.sync_id]));
  const workoutSyncIds = new Map(workouts.map(record => [record.id, record.sync_id]));
  const exerciseSyncIds = new Map(exercises.map(record => [record.id, record.sync_id]));
  const dietSyncIds = new Map(diets.map(record => [record.id, record.sync_id]));
  const dailyLogSyncIds = new Map(dailyLogs.map(record => [record.id, record.sync_id]));
  const cycleSyncIds = new Map(cycles.map(record => [record.id, record.sync_id]));
  const cycleCompounds = loadArray<any>(STORAGE_KEYS.cycleCompounds).map(record => {
    const compound = compoundsById.get(record.compound_id);
    return compound
      ? {
          ...record,
          cycle_sync_id: cycleSyncIds.get(record.cycle_id),
          type: compound.type,
          half_life_hours: compound.half_life_hours,
        }
      : record;
  });

  return {
    weights: loadArray<any>(STORAGE_KEYS.weights),
    routines,
    workouts: workouts.map(record => ({
      ...record,
      routine_sync_id: routineSyncIds.get(record.routine_id),
    })),
    exercises: exercises.map(record => ({
      ...record,
      workout_sync_id: workoutSyncIds.get(record.workout_id),
    })),
    exerciseLogs: loadArray<any>(STORAGE_KEYS.exerciseLogs).map(record => ({
      ...record,
      exercise_sync_id: exerciseSyncIds.get(record.exercise_id),
    })),
    diets,
    dailyLogs: dailyLogs.map(record => ({
      ...record,
      diet_sync_id: dietSyncIds.get(record.diet_id),
    })),
    meals: loadArray<any>(STORAGE_KEYS.meals).map(record => ({
      ...record,
      daily_log_sync_id: dailyLogSyncIds.get(record.daily_log_id),
    })),
    cycles,
    cycleCompounds,
  };
};

export const bulkInsertOrUpdate = async <T extends Record<string, any>>(
  tableName: string,
  records: T[],
  expectedOutboxEntries?: SyncOutboxEntry[],
) => {
  if (records.length === 0) {
    return { appliedSyncIds: [], skippedSyncIds: [] };
  }

  await initDatabase();
  const collectionName = SYNC_COLLECTIONS.find(name => name === tableName);
  if (!collectionName) throw new Error(`Unsupported sync table: ${tableName}`);

  const storageKey = STORAGE_KEY_BY_COLLECTION[collectionName];
  const storedRecords = loadArray<Record<string, any>>(storageKey);
  const recordIndexes = new Map(
    storedRecords.map((record, index) => [String(record.sync_id), index]),
  );
  const relationship = SYNC_RELATIONSHIPS[collectionName];
  const expectedOutboxBySyncId = new Map(
    expectedOutboxEntries?.map(entry => [entry.sync_id, entry]),
  );
  const currentOutboxBySyncId = new Map(
    loadArray<SyncOutboxEntry>(STORAGE_KEYS.syncOutbox)
      .filter(entry => entry.collection_name === collectionName)
      .map(entry => [entry.sync_id, entry]),
  );
  const appliedSyncIds: string[] = [];
  const skippedSyncIds: string[] = [];
  const parentIdsBySyncId = new Map<string, number>();
  if (relationship) {
    const parentRecords = loadArray<{ id: number; sync_id: string }>(
      STORAGE_KEY_BY_COLLECTION[relationship.parentCollection],
    );
    parentRecords.forEach(parent =>
      parentIdsBySyncId.set(parent.sync_id, parent.id),
    );
  }
  const localCompounds = tableName === 'cycle_compounds' ? await getCompounds() : null;
  const compoundsByName = new Map<string, any[]>();
  for (const compound of localCompounds ?? []) {
    const matches = compoundsByName.get(compound.name) ?? [];
    matches.push(compound);
    compoundsByName.set(compound.name, matches);
  }
  let compoundsChanged = false;

  for (const record of records) {
    if (typeof record.sync_id !== 'string' || record.sync_id.length === 0) {
      throw new Error(`Missing sync ID for ${tableName}`);
    }

    if (expectedOutboxEntries) {
      const currentOutbox = currentOutboxBySyncId.get(record.sync_id);
      const expectedOutbox = expectedOutboxBySyncId.get(record.sync_id);
      const outboxChanged = currentOutbox?.operation !== expectedOutbox?.operation
        || currentOutbox?.changed_at !== expectedOutbox?.changed_at;
      if (outboxChanged) {
        skippedSyncIds.push(record.sync_id);
        continue;
      }
    }

    const normalizedRecord: Record<string, any> = { ...record };
    delete normalizedRecord.id;
    delete normalizedRecord.server_modified_at;

    if (relationship) {
      const parentSyncId = normalizedRecord[relationship.remoteKey];
      if (typeof parentSyncId !== 'string') {
        throw new Error(`Missing ${relationship.remoteKey} for ${tableName}`);
      }
      const parentId = parentIdsBySyncId.get(parentSyncId);
      if (parentId === undefined) {
        throw new Error(
          `Missing parent ${relationship.parentCollection}/${parentSyncId}`,
        );
      }
      normalizedRecord[relationship.localKey] = parentId;
      delete normalizedRecord[relationship.remoteKey];
    }

    const isValidType = ['injectable', 'oral', 'peptide'].includes(record.type);
    const halfLifeHours = Number(record.half_life_hours);
    const hasValidMetadata = isValidType
      && Number.isFinite(halfLifeHours)
      && halfLifeHours > 0;
    const matchingCompounds = typeof record.name === 'string'
      ? compoundsByName.get(record.name) ?? []
      : [];
    const matchingCompound = hasValidMetadata
      ? matchingCompounds.find(compound => (
          compound.type === record.type
          && Math.abs(compound.half_life_hours - halfLifeHours) < 1e-9
        ))
      : matchingCompounds.length === 1
        ? matchingCompounds[0]
        : undefined;
    let localCompoundId = matchingCompound?.id;
    if (tableName === 'cycle_compounds' && localCompoundId === undefined) {
      if (!localCompounds || typeof record.name !== 'string' || !hasValidMetadata) {
        throw new Error(`Unknown compound without valid metadata: ${String(record.name)}`);
      }

      const timestamp = nowIso();
      localCompoundId = nextId(localCompounds);
      localCompounds.push({
        id: localCompoundId,
        name: record.name,
        type: record.type,
        half_life_hours: halfLifeHours,
        created_at: timestamp,
        last_modified: timestamp,
      });
      const newCompound = localCompounds[localCompounds.length - 1];
      compoundsByName.set(record.name, [...matchingCompounds, newCompound]);
      compoundsChanged = true;
    }

    if (localCompoundId !== undefined) {
      normalizedRecord.compound_id = localCompoundId;
    }
    delete normalizedRecord.type;
    delete normalizedRecord.half_life_hours;
    const existingIndex = recordIndexes.get(record.sync_id);
    if (existingIndex === undefined) {
      normalizedRecord.id = nextId(storedRecords);
      recordIndexes.set(record.sync_id, storedRecords.length);
      storedRecords.push(normalizedRecord as Record<string, any>);
    } else {
      storedRecords[existingIndex] = {
        ...storedRecords[existingIndex],
        ...normalizedRecord,
      };
    }
    appliedSyncIds.push(record.sync_id);
  }

  if (compoundsChanged && localCompounds) {
    saveArray(STORAGE_KEYS.compounds, localCompounds);
  }
  saveArray(storageKey, storedRecords, { trackChanges: false });
  await clearSyncOutboxEntries(appliedSyncIds.map(syncId => ({
    collection_name: collectionName,
    sync_id: syncId,
  })));
  return { appliedSyncIds, skippedSyncIds };
};

export const getLastSyncTimestamp = async (
  collectionName: string,
): Promise<string | null> => {
  const metadata = loadArray<{ key: string; value: string }>(STORAGE_KEYS.syncMetadata);
  return metadata.find(item => item.key === collectionName)?.value ?? null;
};

export const setLastSyncTimestamp = async (
  collectionName: string,
  timestamp: string,
) => {
  const metadata = loadArray<{ key: string; value: string }>(STORAGE_KEYS.syncMetadata);
  const existing = metadata.find(item => item.key === collectionName);
  if (existing) existing.value = timestamp;
  else metadata.push({ key: collectionName, value: timestamp });
  saveRawArray(STORAGE_KEYS.syncMetadata, metadata);
};

export const getSyncTombstones = async (): Promise<SyncTombstone[]> =>
  loadArray<SyncTombstone>(STORAGE_KEYS.syncTombstones);

export const upsertSyncTombstones = async (tombstones: SyncTombstone[]) => {
  const stored = loadArray<SyncTombstone>(STORAGE_KEYS.syncTombstones);
  tombstones.forEach(tombstone => mergeTombstone(stored, tombstone));
  saveRawArray(STORAGE_KEYS.syncTombstones, stored);
};

const DELETE_ORDER: readonly SyncCollectionName[] = [
  'exercise_logs',
  'exercises',
  'workouts',
  'meals',
  'daily_logs',
  'cycle_compounds',
  'routines',
  'diets',
  'cycles',
  'weights',
];

export const deleteRecordsBySyncIds = async (tombstones: SyncTombstone[]) => {
  for (const collectionName of DELETE_ORDER) {
    const syncIds = new Set(
      tombstones
        .filter(tombstone => tombstone.collection_name === collectionName)
        .map(tombstone => tombstone.sync_id),
    );
    if (syncIds.size === 0) continue;
    const storageKey = STORAGE_KEY_BY_COLLECTION[collectionName];
    const records = loadArray<Record<string, any>>(storageKey);
    const matchingIds = records
      .filter(record => syncIds.has(String(record.sync_id)))
      .map(record => Number(record.id));

    if (collectionName === 'routines') {
      for (const id of matchingIds) await routines.remove(id);
    } else if (collectionName === 'workouts') {
      for (const id of matchingIds) await workouts.remove(id);
    } else if (collectionName === 'exercises') {
      for (const id of matchingIds) await exercises.remove(id);
    } else if (collectionName === 'diets') {
      for (const id of matchingIds) await diets.remove(id);
    } else if (collectionName === 'daily_logs') {
      for (const id of matchingIds) await dailyLogs.remove(id);
    } else if (collectionName === 'cycles') {
      for (const id of matchingIds) await cycles.remove(id);
    } else {
      saveArray(
        storageKey,
        records.filter(record => !syncIds.has(String(record.sync_id))),
      );
    }
  }
};

export const getSyncOutboxEntries = async (): Promise<SyncOutboxEntry[]> =>
  loadArray<SyncOutboxEntry>(STORAGE_KEYS.syncOutbox)
    .sort((first, second) => first.changed_at.localeCompare(second.changed_at));

export const clearSyncOutboxEntries = async (
  entries: (Pick<SyncOutboxEntry, 'collection_name' | 'sync_id'>
    & Partial<Pick<SyncOutboxEntry, 'operation' | 'changed_at'>>)[],
) => {
  if (entries.length === 0) return;
  const outbox = loadArray<SyncOutboxEntry>(STORAGE_KEYS.syncOutbox);
  saveRawArray(
    STORAGE_KEYS.syncOutbox,
    outbox.filter(stored => !entries.some(entry => (
      entry.collection_name === stored.collection_name
      && entry.sync_id === stored.sync_id
      && (!entry.operation || entry.operation === stored.operation)
      && (!entry.changed_at || entry.changed_at === stored.changed_at)
    ))),
  );
};

export const exportDatabase = async () => {
  console.log('Export not supported on web');
  alert('Export not supported on web');
};

export const importDatabase = async () => {
  console.log('Import not supported on web');
  alert('Import not supported on web');
};

// APK metadata (local-only, not synced)
const APK_STORAGE_KEY = 'trackmygains_apk';

export type DownloadedApkMetadata = {
  version_date: string;
  file_name: string | null;
  file_path: string | null;
};

export const getDownloadedApkMetadata = async (): Promise<DownloadedApkMetadata | null> => {
  try {
    const data = localStorage.getItem(APK_STORAGE_KEY);
    return data ? JSON.parse(data) as DownloadedApkMetadata : null;
  } catch {
    return null;
  }
};

export const setApkVersionDate = async (
  versionDate: string,
  fileName?: string,
  filePath?: string,
) => {
  try {
    localStorage.setItem(
      APK_STORAGE_KEY,
      JSON.stringify({
        version_date: versionDate,
        file_name: fileName ?? null,
        file_path: filePath ?? null,
        updated_at: new Date().toISOString(),
      }),
    );
  } catch (e) {
    console.error('Error saving APK metadata', e);
  }
};
