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
} as const;

const loadArray = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T[]) : [];
  } catch (error) {
    console.error('Error loading from localStorage', error);
    throw error;
  }
};

const saveArray = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage', e);
    throw e;
  }
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
  console.log('Web environment detected, using localStorage');
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
    const id = nextId(logs);
    const timestamp = nowIso();
    logs.push({ id, diet_id: dietId, date, created_at: timestamp, last_modified: timestamp });
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
  update: async (id: number, name: string, startDate: string, endDate: string) => {
    const cycles = loadArray<any>(STORAGE_KEYS.cycles);
    const cycle = cycles.find((c: any) => c.id === id);
    if (!cycle) return;
    updateRecord(cycle, { name, start_date: startDate, end_date: endDate });
    saveArray(STORAGE_KEYS.cycles, cycles);
  },
};

export const getCycles = cycles.list;
export const getCycle = cycles.get;
export const addCycle = cycles.add;
export const deleteCycle = cycles.remove;
export const updateCycle = cycles.update;

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
  update: async (
    id: number,
    amount: number,
    amountUnit: 'mg' | 'iu' | 'mcg',
    dosingPeriod: number,
    startDate: string,
    endDate: string
  ) => {
    const cycleCompounds = loadArray<any>(STORAGE_KEYS.cycleCompounds);
    const cc = cycleCompounds.find((c: any) => c.id === id);
    if (!cc) return;
    updateRecord(cc, {
      amount,
      amount_unit: amountUnit,
      dosing_period: dosingPeriod,
      start_date: startDate,
      end_date: endDate,
    });
    saveArray(STORAGE_KEYS.cycleCompounds, cycleCompounds);
  },
};

export const getCycleCompounds = cycleCompounds.list;
export const addCycleCompound = cycleCompounds.add;
export const deleteCycleCompound = cycleCompounds.remove;
export const updateCycleCompound = cycleCompounds.update;

export const getAllDataForSync = async () => {
  const compounds = await getCompounds();
  const compoundsById = new Map(compounds.map(compound => [compound.id, compound]));
  const cycleCompounds = loadArray<any>(STORAGE_KEYS.cycleCompounds).map(record => {
    const compound = compoundsById.get(record.compound_id);
    return compound
      ? { ...record, type: compound.type, half_life_hours: compound.half_life_hours }
      : record;
  });

  return {
    weights: loadArray<any>(STORAGE_KEYS.weights),
    routines: loadArray<any>(STORAGE_KEYS.routines),
    workouts: loadArray<any>(STORAGE_KEYS.workouts),
    exercises: loadArray<any>(STORAGE_KEYS.exercises),
    exerciseLogs: loadArray<any>(STORAGE_KEYS.exerciseLogs),
    diets: loadArray<any>(STORAGE_KEYS.diets),
    dailyLogs: loadArray<any>(STORAGE_KEYS.dailyLogs),
    meals: loadArray<any>(STORAGE_KEYS.meals),
    cycles: loadArray<any>(STORAGE_KEYS.cycles),
    cycleCompounds,
  };
};

const syncStorageKeys: Record<string, string> = {
  weights: STORAGE_KEYS.weights,
  routines: STORAGE_KEYS.routines,
  workouts: STORAGE_KEYS.workouts,
  exercises: STORAGE_KEYS.exercises,
  exercise_logs: STORAGE_KEYS.exerciseLogs,
  diets: STORAGE_KEYS.diets,
  daily_logs: STORAGE_KEYS.dailyLogs,
  meals: STORAGE_KEYS.meals,
  cycles: STORAGE_KEYS.cycles,
  compounds: STORAGE_KEYS.compounds,
  cycle_compounds: STORAGE_KEYS.cycleCompounds,
};

export const bulkInsertOrUpdate = async <T extends Record<string, any>>(
  tableName: string,
  records: T[],
) => {
  if (records.length === 0) return;

  const storageKey = syncStorageKeys[tableName];
  if (!storageKey) throw new Error(`Unsupported sync table: ${tableName}`);

  const storedRecords = loadArray<Record<string, any>>(storageKey);
  const recordIndexes = new Map(
    storedRecords.map((record, index) => [String(record.id), index]),
  );
  const localCompounds = tableName === 'cycle_compounds' ? await getCompounds() : null;
  const compoundsByName = new Map<string, any[]>();
  for (const compound of localCompounds ?? []) {
    const matches = compoundsByName.get(compound.name) ?? [];
    matches.push(compound);
    compoundsByName.set(compound.name, matches);
  }
  let compoundsChanged = false;

  for (const record of records) {
    const id = Number(record.id);
    if (!Number.isFinite(id)) throw new Error(`Invalid record ID for ${tableName}`);

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

    const normalizedRecord = {
      ...record,
      id,
      ...(localCompoundId === undefined ? {} : { compound_id: localCompoundId }),
    };
    delete normalizedRecord.type;
    delete normalizedRecord.half_life_hours;
    const existingIndex = recordIndexes.get(String(id));
    if (existingIndex === undefined) {
      recordIndexes.set(String(id), storedRecords.length);
      storedRecords.push(normalizedRecord);
    } else {
      storedRecords[existingIndex] = {
        ...storedRecords[existingIndex],
        ...normalizedRecord,
      };
    }
  }

  if (compoundsChanged && localCompounds) {
    saveArray(STORAGE_KEYS.compounds, localCompounds);
  }
  saveArray(storageKey, storedRecords);
};

export const clearTable = async (tableName: string) => {
  const storageKey = syncStorageKeys[tableName];
  if (!storageKey) throw new Error(`Unsupported sync table: ${tableName}`);
  saveArray(storageKey, []);
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

export const getApkVersionDate = async (): Promise<string | null> => {
  try {
    const data = localStorage.getItem(APK_STORAGE_KEY);
    return data ? (JSON.parse(data) as { version_date: string }).version_date : null;
  } catch {
    return null;
  }
};

export const setApkVersionDate = async (versionDate: string, _fileName?: string) => {
  try {
    localStorage.setItem(
      APK_STORAGE_KEY,
      JSON.stringify({ version_date: versionDate, updated_at: new Date().toISOString() }),
    );
  } catch (e) {
    console.error('Error saving APK metadata', e);
  }
};
