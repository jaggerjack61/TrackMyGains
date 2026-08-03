import type {
  SyncConflictRecord,
  SyncOutboxEntry,
  SyncTombstone,
} from './sync-records';

interface SyncIdentity {
  sync_id: string;
  last_modified?: string;
}

export interface WeightRecord extends SyncIdentity {
  id: number;
  weight: number;
  date: string;
}

export interface Routine extends SyncIdentity {
  id: number;
  name: string;
  created_at: string;
  sort_order: number;
}

export interface Workout extends SyncIdentity {
  id: number;
  routine_id: number;
  name: string;
  date: string;
  created_at: string;
  sort_order: number;
}

export interface Exercise extends SyncIdentity {
  id: number;
  workout_id: number;
  name: string;
  created_at: string;
}

export interface ExerciseLog extends SyncIdentity {
  id: number;
  exercise_id: number;
  date: string;
  weight: number;
  weight_unit: "kg" | "lbs";
  reps: number;
  sets: number;
  created_at: string;
}

export interface Diet extends SyncIdentity {
  id: number;
  name: string;
  created_at: string;
  sort_order: number;
}

export interface DailyLog extends SyncIdentity {
  id: number;
  diet_id: number;
  date: string;
  created_at: string;
}

export interface Meal extends SyncIdentity {
  id: number;
  daily_log_id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
}

export interface Cycle extends SyncIdentity {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Compound {
  id: number;
  name: string;
  type: "injectable" | "oral" | "peptide";
  half_life_hours: number;
  created_at: string;
}

export interface CycleCompound extends SyncIdentity {
  id: number;
  cycle_id: number;
  compound_id: number;
  name: string; // denormalized for easier access or custom names
  type: "injectable" | "oral" | "peptide";
  amount: number;
  amount_unit: "mg" | "iu" | "mcg";
  dosing_period: number; // in days, e.g., 7 for weekly
  start_date: string;
  end_date: string;
  half_life_hours: number; // Joined from compounds
  created_at: string;
}

export declare const initDatabase: () => Promise<void>;
export declare const getAllDataForSync: () => Promise<{
  weights: (Record<string, any> & { id: number } & SyncIdentity)[];
  routines: (Record<string, any> & { id: number } & SyncIdentity)[];
  workouts: (Record<string, any> & { id: number } & SyncIdentity)[];
  exercises: (Record<string, any> & { id: number } & SyncIdentity)[];
  exerciseLogs: (Record<string, any> & { id: number } & SyncIdentity)[];
  diets: (Record<string, any> & { id: number } & SyncIdentity)[];
  dailyLogs: (Record<string, any> & { id: number } & SyncIdentity)[];
  meals: (Record<string, any> & { id: number } & SyncIdentity)[];
  cycles: (Record<string, any> & { id: number } & SyncIdentity)[];
  cycleCompounds: (Record<string, any> & { id: number } & SyncIdentity)[];
}>;
export declare const addWeight: (weight: number, date: string) => Promise<void>;
export declare const getWeights: () => Promise<WeightRecord[]>;
export declare const deleteWeight: (id: number) => Promise<void>;

// Routines
export declare const getRoutines: () => Promise<Routine[]>;
export declare const addRoutine: (name: string) => Promise<void>;
export declare const deleteRoutine: (id: number) => Promise<void>;
export declare const updateRoutineOrder: (routines: Routine[]) => Promise<void>;
export declare const updateRoutine: (id: number, name: string) => Promise<void>;

// Workouts
export declare const getWorkouts: (routineId: number) => Promise<Workout[]>;
export declare const addWorkout: (
  routineId: number,
  name: string,
) => Promise<void>;
export declare const deleteWorkout: (id: number) => Promise<void>;
export declare const updateWorkoutOrder: (workouts: Workout[]) => Promise<void>;
export declare const updateWorkout: (id: number, name: string) => Promise<void>;

// Exercises
export declare const getExercises: (workoutId: number) => Promise<Exercise[]>;
export declare const addExercise: (
  workoutId: number,
  name: string,
) => Promise<void>;
export declare const deleteExercise: (id: number) => Promise<void>;
export declare const updateExercise: (
  id: number,
  name: string,
) => Promise<void>;

// Exercise Logs
export declare const getExerciseLogs: (
  exerciseId: number,
) => Promise<ExerciseLog[]>;
export declare const addExerciseLog: (
  exerciseId: number,
  date: string,
  weight: number,
  weightUnit: "kg" | "lbs",
  reps: number,
  sets: number,
) => Promise<void>;
export declare const deleteExerciseLog: (id: number) => Promise<void>;
export declare const updateExerciseLog: (
  id: number,
  date: string,
  weight: number,
  weightUnit: "kg" | "lbs",
  reps: number,
  sets: number,
) => Promise<void>;

// Diets
export declare const getDiets: () => Promise<Diet[]>;
export declare const addDiet: (name: string) => Promise<void>;
export declare const deleteDiet: (id: number) => Promise<void>;

// Cycles
export declare const getCycles: () => Promise<Cycle[]>;
export declare const getCycle: (id: number) => Promise<Cycle | null>;
export declare const addCycle: (
  name: string,
  startDate: string,
  endDate: string,
) => Promise<void>;
export declare const deleteCycle: (id: number) => Promise<void>;

// Compounds (Reference Data)
export declare const getCompounds: () => Promise<Compound[]>;
export declare const addCompound: (
  name: string,
  type: "injectable" | "oral" | "peptide",
  halfLifeHours: number,
) => Promise<void>;

// Cycle Compounds
export declare const getCycleCompounds: (
  cycleId: number,
) => Promise<CycleCompound[]>;
export declare const addCycleCompound: (
  cycleId: number,
  compoundId: number,
  name: string,
  amount: number,
  amountUnit: "mg" | "iu" | "mcg",
  dosingPeriod: number,
  startDate: string,
  endDate: string,
) => Promise<void>;
export declare const deleteCycleCompound: (id: number) => Promise<void>;
export declare const updateDietOrder: (diets: Diet[]) => Promise<void>;
export declare const updateDiet: (id: number, name: string) => Promise<void>;

// Daily Logs
export declare const getDailyLogs: (dietId: number) => Promise<DailyLog[]>;
export interface DailyLogWithStats extends DailyLog {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
}
export declare const getDailyLogsWithStats: (
  dietId: number,
) => Promise<DailyLogWithStats[]>;
export declare const addDailyLog: (
  dietId: number,
  date: string,
) => Promise<number>; // Returns the ID of the new log
export declare const deleteDailyLog: (id: number) => Promise<void>;
export declare const getDailyLogByDate: (
  dietId: number,
  date: string,
) => Promise<DailyLog | null>;

// Meals
export declare const getMeals: (dailyLogId: number) => Promise<Meal[]>;
export declare const addMeal: (
  dailyLogId: number,
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
) => Promise<void>;
export declare const deleteMeal: (id: number) => Promise<void>;
export declare const getRecentMeals: (query: string) => Promise<Meal[]>;
export declare const updateMeal: (
  id: number,
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
) => Promise<void>;

export declare const exportDatabase: () => Promise<void>;
export declare const importDatabase: () => Promise<void>;

// Sync metadata functions
export declare const getLastSyncTimestamp: (
  collectionName: string,
) => Promise<string | null>;
export declare const setLastSyncTimestamp: (
  collectionName: string,
  timestamp: string,
) => Promise<void>;
export declare const bulkInsertOrUpdate: <T extends Record<string, any>>(
  tableName: string,
  records: T[],
  expectedOutboxEntries?: SyncOutboxEntry[],
  conflictLosers?: T[],
) => Promise<{ appliedSyncIds: string[]; skippedSyncIds: string[] }>;
export declare const getSyncTombstones: () => Promise<SyncTombstone[]>;
export declare const upsertSyncTombstones: (
  tombstones: SyncTombstone[],
) => Promise<void>;
export declare const deleteRecordsBySyncIds: (
  tombstones: SyncTombstone[],
) => Promise<void>;
export declare const getSyncOutboxEntries: () => Promise<SyncOutboxEntry[]>;
export declare const clearSyncOutboxEntries: (
  entries: (Pick<SyncOutboxEntry, 'collection_name' | 'sync_id'>
    & Partial<Pick<SyncOutboxEntry, 'operation' | 'changed_at'>>)[],
) => Promise<void>;
// Conflict preservation (local-only, not synced to Firestore)
export declare const saveSyncConflicts: (
  conflicts: { collection_name: string; sync_id: string; payload: string }[],
) => Promise<void>;
export declare const getSyncConflicts: () => Promise<SyncConflictRecord[]>;
export declare const restoreSyncConflict: (
  conflict: { collection_name: string; sync_id: string; payload: string },
) => Promise<boolean>;
export declare const deleteSyncConflict: (
  collectionName: string,
  syncId: string,
) => Promise<void>;

// APK metadata (local-only, not synced to Firestore)
export interface DownloadedApkMetadata {
  version_date: string;
  file_name: string | null;
  file_path: string | null;
}
export declare const getDownloadedApkMetadata: () => Promise<DownloadedApkMetadata | null>;
export declare const setApkVersionDate: (
  versionDate: string,
  fileName?: string,
  filePath?: string,
) => Promise<void>;
