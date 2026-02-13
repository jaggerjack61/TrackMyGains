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
  } catch {
    return [];
  }
};

const saveArray = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
};

const nowId = (): number => Date.now();
const nowIso = (): string => new Date().toISOString();

const sortByCreatedAtDesc = (a: { created_at: string }, b: { created_at: string }) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

export const initDatabase = async () => {
  console.log('Web environment detected, using localStorage');
};

const weights = {
  add: async (weight: number, date: string) => {
    const weights = loadArray<{ id: number; weight: number; date: string }>(STORAGE_KEYS.weights);
    weights.push({ id: nowId(), weight, date });
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
    const routines = loadArray<{ id: number; name: string; created_at: string; sort_order?: number }>(STORAGE_KEYS.routines);
    const maxOrder = routines.reduce((max, r) => Math.max(max, r.sort_order ?? 0), 0);
    routines.push({ id: nowId(), name, created_at: nowIso(), sort_order: maxOrder + 1 });
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
    saveArray(
      STORAGE_KEYS.exercises,
      exercises.filter(e => !workoutIds.has(e.workout_id))
    );
  },
  updateOrder: async (routines: { id: number; sort_order: number }[]) => {
    const allRoutines = loadArray<{ id: number; sort_order?: number }>(STORAGE_KEYS.routines);
    const routineMap = new Map(allRoutines.map(r => [r.id, r]));

    for (let index = 0; index < routines.length; index++) {
      const routine = routines[index];
      const existing = routineMap.get(routine.id);
      if (existing) existing.sort_order = index;
    }

    saveArray(STORAGE_KEYS.routines, Array.from(routineMap.values()));
  },
  update: async (id: number, name: string) => {
    const routines = loadArray<{ id: number; name: string }>(STORAGE_KEYS.routines);
    const index = routines.findIndex(r => r.id === id);
    if (index === -1) return;
    routines[index].name = name;
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
    const workouts = loadArray<{ id: number; routine_id: number; name: string; date: string; created_at: string; sort_order?: number }>(
      STORAGE_KEYS.workouts
    );
    const routineWorkouts = workouts.filter(w => w.routine_id === routineId);
    const maxOrder = routineWorkouts.reduce((max, w) => Math.max(max, w.sort_order ?? 0), 0);

    workouts.push({
      id: nowId(),
      routine_id: routineId,
      name,
      date: nowIso(),
      created_at: nowIso(),
      sort_order: maxOrder + 1,
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
    saveArray(
      STORAGE_KEYS.exercises,
      exercises.filter(e => e.workout_id !== id)
    );
  },
  updateOrder: async (workouts: { id: number; sort_order: number }[]) => {
    const allWorkouts = loadArray<{ id: number; sort_order?: number }>(STORAGE_KEYS.workouts);
    const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));

    for (let index = 0; index < workouts.length; index++) {
      const workout = workouts[index];
      const existing = workoutMap.get(workout.id);
      if (existing) existing.sort_order = index;
    }

    saveArray(STORAGE_KEYS.workouts, Array.from(workoutMap.values()));
  },
  update: async (id: number, name: string) => {
    const workouts = loadArray<{ id: number; name: string }>(STORAGE_KEYS.workouts);
    const index = workouts.findIndex(w => w.id === id);
    if (index === -1) return;
    workouts[index].name = name;
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
    const exercises = loadArray<{ id: number; workout_id: number; name: string; created_at: string }>(STORAGE_KEYS.exercises);
    exercises.push({ id: nowId(), workout_id: workoutId, name, created_at: nowIso() });
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
    exercises[index].name = name;
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
    const logs = loadArray(STORAGE_KEYS.exerciseLogs);
    logs.push({
      id: nowId(),
      exercise_id: exerciseId,
      date,
      weight,
      weight_unit: weightUnit,
      reps,
      sets,
      created_at: nowIso(),
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
    logs[index] = { ...logs[index], date, weight, weight_unit: weightUnit, reps, sets };
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
    const diets = loadArray<{ id: number; name: string; created_at: string; sort_order?: number }>(STORAGE_KEYS.diets);
    const maxOrder = diets.reduce((max, d) => Math.max(max, d.sort_order ?? 0), 0);
    diets.push({ id: nowId(), name, created_at: nowIso(), sort_order: maxOrder + 1 });
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

    for (let index = 0; index < diets.length; index++) {
      const diet = diets[index];
      const existing = dietMap.get(diet.id);
      if (existing) existing.sort_order = index;
    }

    saveArray(STORAGE_KEYS.diets, Array.from(dietMap.values()));
  },
  update: async (id: number, name: string) => {
    const diets = loadArray<{ id: number; name: string }>(STORAGE_KEYS.diets);
    const index = diets.findIndex(d => d.id === id);
    if (index === -1) return;
    diets[index].name = name;
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
    const id = nowId();
    logs.push({ id, diet_id: dietId, date, created_at: nowIso() });
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
    meals.push({ id: nowId(), daily_log_id: dailyLogId, name, calories, protein, carbs, fats, created_at: nowIso() });
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
    meals[index] = { ...meals[index], name, calories, protein, carbs, fats };
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
    cycles.push({ id: nowId(), name, start_date: startDate, end_date: endDate, created_at: nowIso() });
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
    cycle.name = name;
    cycle.start_date = startDate;
    cycle.end_date = endDate;
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
      compounds = defaultCompounds;
      saveArray(STORAGE_KEYS.compounds, compounds);
    } else {
      const existingNames = new Set(compounds.map((c: any) => String(c.name)));
      let nextId = compounds.reduce((max: number, c: any) => Math.max(max, Number(c.id) || 0), 0) + 1;

      for (const compound of defaultCompounds) {
        if (existingNames.has(compound.name)) continue;
        compounds.push({ ...compound, id: nextId++, created_at: nowIso() });
      }

      saveArray(STORAGE_KEYS.compounds, compounds);
    }
    return compounds.sort((a: any, b: any) => a.name.localeCompare(b.name));
  },
  add: async (name: string, type: 'injectable' | 'oral' | 'peptide', halfLifeHours: number) => {
    const compounds = loadArray<any>(STORAGE_KEYS.compounds);
    compounds.push({ id: nowId(), name, type, half_life_hours: halfLifeHours, created_at: nowIso() });
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
    cycleCompounds.push({
      id: nowId(),
      cycle_id: cycleId,
      compound_id: compoundId,
      name,
      amount,
      amount_unit: amountUnit,
      dosing_period: dosingPeriod,
      start_date: startDate,
      end_date: endDate,
      created_at: nowIso(),
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
    cc.amount = amount;
    cc.amount_unit = amountUnit;
    cc.dosing_period = dosingPeriod;
    cc.start_date = startDate;
    cc.end_date = endDate;
    saveArray(STORAGE_KEYS.cycleCompounds, cycleCompounds);
  },
};

export const getCycleCompounds = cycleCompounds.list;
export const addCycleCompound = cycleCompounds.add;
export const deleteCycleCompound = cycleCompounds.remove;
export const updateCycleCompound = cycleCompounds.update;
