type SyncRecord = Record<string, unknown>;

const withCreatedAndModified = (...columns: readonly string[]) => [
  'id',
  ...columns,
  'created_at',
  'last_modified',
];

const withModified = (...columns: readonly string[]) => [
  'id',
  ...columns,
  'last_modified',
];

const persistedColumnsByCollection: Record<string, readonly string[]> = {
  weights: withModified('weight', 'date'),
  routines: withCreatedAndModified('name', 'sort_order'),
  workouts: withCreatedAndModified('routine_id', 'name', 'date', 'sort_order'),
  exercises: withCreatedAndModified('workout_id', 'name'),
  exercise_logs: withCreatedAndModified(
    'exercise_id',
    'date',
    'weight',
    'weight_unit',
    'reps',
    'sets',
  ),
  diets: withCreatedAndModified('name', 'sort_order'),
  daily_logs: withCreatedAndModified('diet_id', 'date'),
  meals: withCreatedAndModified(
    'daily_log_id',
    'name',
    'calories',
    'protein',
    'carbs',
    'fats',
  ),
  cycles: withCreatedAndModified('name', 'start_date', 'end_date'),
  compounds: withCreatedAndModified('name', 'type', 'half_life_hours'),
  cycle_compounds: withCreatedAndModified(
    'cycle_id',
    'compound_id',
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

export const sanitizeRecordForSync = <T extends SyncRecord>(
  collectionName: string,
  record: T,
): T => {
  const persistedColumns = persistedColumnsByCollection[collectionName];
  if (!persistedColumns) {
    return record;
  }

  const sanitizedRecord: SyncRecord = {};

  persistedColumns.forEach((column) => {
    if (column in record) {
      sanitizedRecord[column] = record[column];
    }
  });

  return sanitizedRecord as T;
};
