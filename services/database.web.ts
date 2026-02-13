// Web implementation using localStorage
const WEB_STORAGE_KEY_WEIGHTS = 'trackmygains_weights';
const WEB_STORAGE_KEY_ROUTINES = 'trackmygains_routines';
const WEB_STORAGE_KEY_WORKOUTS = 'trackmygains_workouts';
const WEB_STORAGE_KEY_EXERCISES = 'trackmygains_exercises';
const WEB_STORAGE_KEY_EXERCISE_LOGS = 'trackmygains_exercise_logs';
const WEB_STORAGE_KEY_DIETS = 'trackmygains_diets';
const WEB_STORAGE_KEY_DAILY_LOGS = 'trackmygains_daily_logs';
const WEB_STORAGE_KEY_MEALS = 'trackmygains_meals';

const getWebData = (key: string): any[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveWebData = (key: string, data: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
};

export const initDatabase = async () => {
  console.log('Web environment detected, using localStorage');
};

// Weights
export const addWeight = async (weight: number, date: string) => {
  const weights = getWebData(WEB_STORAGE_KEY_WEIGHTS);
  const newWeight = {
    id: Date.now(),
    weight,
    date
  };
  weights.push(newWeight);
  saveWebData(WEB_STORAGE_KEY_WEIGHTS, weights);
};

export const getWeights = async () => {
  return getWebData(WEB_STORAGE_KEY_WEIGHTS).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const deleteWeight = async (id: number) => {
  const weights = getWebData(WEB_STORAGE_KEY_WEIGHTS);
  const filtered = weights.filter(w => w.id !== id);
  saveWebData(WEB_STORAGE_KEY_WEIGHTS, filtered);
};

// Routines
export const getRoutines = async () => {
  return getWebData(WEB_STORAGE_KEY_ROUTINES).sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

export const addRoutine = async (name: string) => {
  const routines = getWebData(WEB_STORAGE_KEY_ROUTINES);
  const maxOrder = routines.reduce((max, r) => Math.max(max, r.sort_order || 0), 0);
  const newRoutine = {
    id: Date.now(),
    name,
    created_at: new Date().toISOString(),
    sort_order: maxOrder + 1
  };
  routines.push(newRoutine);
  saveWebData(WEB_STORAGE_KEY_ROUTINES, routines);
};

export const deleteRoutine = async (id: number) => {
  const routines = getWebData(WEB_STORAGE_KEY_ROUTINES);
  saveWebData(WEB_STORAGE_KEY_ROUTINES, routines.filter(r => r.id !== id));
  
  // Cascade delete workouts
  const workouts = getWebData(WEB_STORAGE_KEY_WORKOUTS);
  const workoutsToDelete = workouts.filter(w => w.routine_id === id);
  saveWebData(WEB_STORAGE_KEY_WORKOUTS, workouts.filter(w => w.routine_id !== id));
  
  // Cascade delete exercises
  const exercises = getWebData(WEB_STORAGE_KEY_EXERCISES);
  const workoutIds = workoutsToDelete.map(w => w.id);
  saveWebData(WEB_STORAGE_KEY_EXERCISES, exercises.filter(e => !workoutIds.includes(e.workout_id)));
};

export const updateRoutineOrder = async (routines: { id: number; sort_order: number }[]) => {
    const allRoutines = getWebData(WEB_STORAGE_KEY_ROUTINES);
    const routineMap = new Map(allRoutines.map(r => [r.id, r]));

    routines.forEach((r, index) => {
        const existing = routineMap.get(r.id);
        if (existing) {
            existing.sort_order = index;
        }
    });

    saveWebData(WEB_STORAGE_KEY_ROUTINES, Array.from(routineMap.values()));
};

export const updateRoutine = async (id: number, name: string) => {
  const routines = getWebData(WEB_STORAGE_KEY_ROUTINES);
  const index = routines.findIndex(r => r.id === id);
  if (index !== -1) {
    routines[index].name = name;
    saveWebData(WEB_STORAGE_KEY_ROUTINES, routines);
  }
};

// Workouts
export const getWorkouts = async (routineId: number) => {
  return getWebData(WEB_STORAGE_KEY_WORKOUTS)
    .filter(w => w.routine_id === routineId)
    .sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
            return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
};

export const addWorkout = async (routineId: number, name: string) => {
  const workouts = getWebData(WEB_STORAGE_KEY_WORKOUTS);
  const routineWorkouts = workouts.filter(w => w.routine_id === routineId);
  const maxOrder = routineWorkouts.reduce((max, w) => Math.max(max, w.sort_order || 0), 0);
  
  const newWorkout = {
    id: Date.now(),
    routine_id: routineId,
    name,
    date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    sort_order: maxOrder + 1
  };
  workouts.push(newWorkout);
  saveWebData(WEB_STORAGE_KEY_WORKOUTS, workouts);
};

export const deleteWorkout = async (id: number) => {
  const workouts = getWebData(WEB_STORAGE_KEY_WORKOUTS);
  saveWebData(WEB_STORAGE_KEY_WORKOUTS, workouts.filter(w => w.id !== id));
  
  // Cascade delete exercises
  const exercises = getWebData(WEB_STORAGE_KEY_EXERCISES);
  saveWebData(WEB_STORAGE_KEY_EXERCISES, exercises.filter(e => e.workout_id !== id));
};

export const updateWorkoutOrder = async (workouts: { id: number; sort_order: number }[]) => {
    const allWorkouts = getWebData(WEB_STORAGE_KEY_WORKOUTS);
    const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));

    workouts.forEach((w, index) => {
        const existing = workoutMap.get(w.id);
        if (existing) {
            existing.sort_order = index;
        }
    });

    saveWebData(WEB_STORAGE_KEY_WORKOUTS, Array.from(workoutMap.values()));
};

export const updateWorkout = async (id: number, name: string) => {
  const workouts = getWebData(WEB_STORAGE_KEY_WORKOUTS);
  const index = workouts.findIndex(w => w.id === id);
  if (index !== -1) {
    workouts[index].name = name;
    saveWebData(WEB_STORAGE_KEY_WORKOUTS, workouts);
  }
};

// Exercises
export const getExercises = async (workoutId: number) => {
  return getWebData(WEB_STORAGE_KEY_EXERCISES)
    .filter(e => e.workout_id === workoutId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const addExercise = async (workoutId: number, name: string) => {
  const exercises = getWebData(WEB_STORAGE_KEY_EXERCISES);
  const newExercise = {
    id: Date.now(),
    workout_id: workoutId,
    name,
    created_at: new Date().toISOString()
  };
  exercises.push(newExercise);
  saveWebData(WEB_STORAGE_KEY_EXERCISES, exercises);
};

export const deleteExercise = async (id: number) => {
  const exercises = getWebData(WEB_STORAGE_KEY_EXERCISES);
  saveWebData(WEB_STORAGE_KEY_EXERCISES, exercises.filter(e => e.id !== id));
  
  // Cascade delete logs
  const logs = getWebData(WEB_STORAGE_KEY_EXERCISE_LOGS);
  saveWebData(WEB_STORAGE_KEY_EXERCISE_LOGS, logs.filter(l => l.exercise_id !== id));
};

export const updateExercise = async (id: number, name: string) => {
  const exercises = getWebData(WEB_STORAGE_KEY_EXERCISES);
  const index = exercises.findIndex(e => e.id === id);
  if (index !== -1) {
    exercises[index].name = name;
    saveWebData(WEB_STORAGE_KEY_EXERCISES, exercises);
  }
};

// Exercise Logs
export const getExerciseLogs = async (exerciseId: number) => {
  return getWebData(WEB_STORAGE_KEY_EXERCISE_LOGS)
    .filter(l => l.exercise_id === exerciseId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addExerciseLog = async (exerciseId: number, date: string, weight: number, weightUnit: 'kg' | 'lbs', reps: number, sets: number) => {
  const logs = getWebData(WEB_STORAGE_KEY_EXERCISE_LOGS);
  const newLog = {
    id: Date.now(),
    exercise_id: exerciseId,
    date,
    weight,
    weight_unit: weightUnit,
    reps,
    sets,
    created_at: new Date().toISOString()
  };
  logs.push(newLog);
  saveWebData(WEB_STORAGE_KEY_EXERCISE_LOGS, logs);
};

export const deleteExerciseLog = async (id: number) => {
  const logs = getWebData(WEB_STORAGE_KEY_EXERCISE_LOGS);
  saveWebData(WEB_STORAGE_KEY_EXERCISE_LOGS, logs.filter(l => l.id !== id));
};

export const updateExerciseLog = async (id: number, date: string, weight: number, weightUnit: 'kg' | 'lbs', reps: number, sets: number) => {
  const logs = getWebData(WEB_STORAGE_KEY_EXERCISE_LOGS);
  const index = logs.findIndex(l => l.id === id);
  if (index !== -1) {
    logs[index] = { ...logs[index], date, weight, weight_unit: weightUnit, reps, sets };
    saveWebData(WEB_STORAGE_KEY_EXERCISE_LOGS, logs);
  }
};

// Diets
export const getDiets = async () => {
  return getWebData(WEB_STORAGE_KEY_DIETS).sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

export const addDiet = async (name: string) => {
  const diets = getWebData(WEB_STORAGE_KEY_DIETS);
  const maxOrder = diets.reduce((max, r) => Math.max(max, r.sort_order || 0), 0);
  const newDiet = {
    id: Date.now(),
    name,
    created_at: new Date().toISOString(),
    sort_order: maxOrder + 1
  };
  diets.push(newDiet);
  saveWebData(WEB_STORAGE_KEY_DIETS, diets);
};

export const deleteDiet = async (id: number) => {
  const diets = getWebData(WEB_STORAGE_KEY_DIETS);
  saveWebData(WEB_STORAGE_KEY_DIETS, diets.filter(d => d.id !== id));
  
  // Cascade delete daily logs
  const dailyLogs = getWebData(WEB_STORAGE_KEY_DAILY_LOGS);
  const dailyLogsToDelete = dailyLogs.filter(l => l.diet_id === id);
  saveWebData(WEB_STORAGE_KEY_DAILY_LOGS, dailyLogs.filter(l => l.diet_id !== id));
  
  // Cascade delete meals
  const meals = getWebData(WEB_STORAGE_KEY_MEALS);
  const dailyLogIds = dailyLogsToDelete.map(l => l.id);
  saveWebData(WEB_STORAGE_KEY_MEALS, meals.filter(m => !dailyLogIds.includes(m.daily_log_id)));
};

export const updateDietOrder = async (diets: { id: number; sort_order: number }[]) => {
    const allDiets = getWebData(WEB_STORAGE_KEY_DIETS);
    const dietMap = new Map(allDiets.map(d => [d.id, d]));

    diets.forEach((d, index) => {
        const existing = dietMap.get(d.id);
        if (existing) {
            existing.sort_order = index;
        }
    });

    saveWebData(WEB_STORAGE_KEY_DIETS, Array.from(dietMap.values()));
};

export const updateDiet = async (id: number, name: string) => {
  const diets = getWebData(WEB_STORAGE_KEY_DIETS);
  const index = diets.findIndex(d => d.id === id);
  if (index !== -1) {
    diets[index].name = name;
    saveWebData(WEB_STORAGE_KEY_DIETS, diets);
  }
};

// Daily Logs
export const getDailyLogs = async (dietId: number) => {
  return getWebData(WEB_STORAGE_KEY_DAILY_LOGS)
    .filter(l => l.diet_id === dietId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getDailyLogByDate = async (dietId: number, date: string) => {
  const logs = getWebData(WEB_STORAGE_KEY_DAILY_LOGS);
  return logs.find(l => l.diet_id === dietId && l.date === date) || null;
};

export const addDailyLog = async (dietId: number, date: string) => {
  const logs = getWebData(WEB_STORAGE_KEY_DAILY_LOGS);
  const id = Date.now();
  const newLog = {
    id,
    diet_id: dietId,
    date,
    created_at: new Date().toISOString()
  };
  logs.push(newLog);
  saveWebData(WEB_STORAGE_KEY_DAILY_LOGS, logs);
  return id;
};

export const deleteDailyLog = async (id: number) => {
  const logs = getWebData(WEB_STORAGE_KEY_DAILY_LOGS);
  saveWebData(WEB_STORAGE_KEY_DAILY_LOGS, logs.filter(l => l.id !== id));
  
  // Cascade delete meals
  const meals = getWebData(WEB_STORAGE_KEY_MEALS);
  saveWebData(WEB_STORAGE_KEY_MEALS, meals.filter(m => m.daily_log_id !== id));
};

// Meals
export const getMeals = async (dailyLogId: number) => {
  return getWebData(WEB_STORAGE_KEY_MEALS)
    .filter(m => m.daily_log_id === dailyLogId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const addMeal = async (dailyLogId: number, name: string, calories: number, protein: number, carbs: number, fats: number) => {
  const meals = getWebData(WEB_STORAGE_KEY_MEALS);
  const newMeal = {
    id: Date.now(),
    daily_log_id: dailyLogId,
    name,
    calories,
    protein,
    carbs,
    fats,
    created_at: new Date().toISOString()
  };
  meals.push(newMeal);
  saveWebData(WEB_STORAGE_KEY_MEALS, meals);
};

export const deleteMeal = async (id: number) => {
  const meals = getWebData(WEB_STORAGE_KEY_MEALS);
  saveWebData(WEB_STORAGE_KEY_MEALS, meals.filter(m => m.id !== id));
};

export const updateMeal = async (id: number, name: string, calories: number, protein: number, carbs: number, fats: number) => {
  const meals = getWebData(WEB_STORAGE_KEY_MEALS);
  const index = meals.findIndex(m => m.id === id);
  if (index !== -1) {
    meals[index] = { ...meals[index], name, calories, protein, carbs, fats };
    saveWebData(WEB_STORAGE_KEY_MEALS, meals);
  }
};

export const getRecentMeals = async (query: string) => {
  const meals = getWebData(WEB_STORAGE_KEY_MEALS);
  const matchedMeals = meals.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
  
  // Deduplicate by name, keeping the most recent one
  const uniqueMeals = new Map();
  matchedMeals.forEach(meal => {
    if (!uniqueMeals.has(meal.name)) {
      uniqueMeals.set(meal.name, meal);
    } else {
        if (new Date(meal.created_at) > new Date(uniqueMeals.get(meal.name).created_at)) {
            uniqueMeals.set(meal.name, meal);
        }
    }
  });
  
  return Array.from(uniqueMeals.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
};

// Cycles
const WEB_STORAGE_KEY_CYCLES = 'trackmygains_cycles';
const WEB_STORAGE_KEY_COMPOUNDS = 'trackmygains_compounds';
const WEB_STORAGE_KEY_CYCLE_COMPOUNDS = 'trackmygains_cycle_compounds';

export const getCycles = async () => {
  return getWebData(WEB_STORAGE_KEY_CYCLES).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
};

export const getCycle = async (id: number) => {
  const cycles = getWebData(WEB_STORAGE_KEY_CYCLES);
  return cycles.find(c => c.id === id) || null;
};

export const addCycle = async (name: string, startDate: string, endDate: string) => {
  const cycles = getWebData(WEB_STORAGE_KEY_CYCLES);
  const newCycle = {
    id: Date.now(),
    name,
    start_date: startDate,
    end_date: endDate,
    created_at: new Date().toISOString()
  };
  cycles.push(newCycle);
  saveWebData(WEB_STORAGE_KEY_CYCLES, cycles);
};

export const deleteCycle = async (id: number) => {
  const cycles = getWebData(WEB_STORAGE_KEY_CYCLES);
  saveWebData(WEB_STORAGE_KEY_CYCLES, cycles.filter(c => c.id !== id));
  
  // Cascade delete cycle compounds
  const cycleCompounds = getWebData(WEB_STORAGE_KEY_CYCLE_COMPOUNDS);
  saveWebData(WEB_STORAGE_KEY_CYCLE_COMPOUNDS, cycleCompounds.filter(cc => cc.cycle_id !== id));
};

export const updateCycle = async (id: number, name: string, startDate: string, endDate: string) => {
    const cycles = getWebData(WEB_STORAGE_KEY_CYCLES);
    const cycle = cycles.find(c => c.id === id);
    if (cycle) {
        cycle.name = name;
        cycle.start_date = startDate;
        cycle.end_date = endDate;
        saveWebData(WEB_STORAGE_KEY_CYCLES, cycles);
    }
};

// Compounds
export const getCompounds = async () => {
    let compounds = getWebData(WEB_STORAGE_KEY_COMPOUNDS);
    if (compounds.length === 0) {
        // Preload default compounds
        compounds = [
          // Injectables (Steroids)
          { id: 1, name: 'Testosterone Enanthate', type: 'injectable', half_life_hours: 108 }, 
          { id: 2, name: 'Testosterone Cypionate', type: 'injectable', half_life_hours: 120 },
          { id: 3, name: 'Testosterone Propionate', type: 'injectable', half_life_hours: 19 },
          { id: 4, name: 'Nandrolone Decanoate (Deca)', type: 'injectable', half_life_hours: 144 },
          { id: 5, name: 'Nandrolone Phenylpropionate (NPP)', type: 'injectable', half_life_hours: 27 },
          { id: 6, name: 'Trenbolone Acetate', type: 'injectable', half_life_hours: 24 },
          { id: 7, name: 'Trenbolone Enanthate', type: 'injectable', half_life_hours: 120 },
          { id: 8, name: 'Boldenone Undecylenate (Equipoise)', type: 'injectable', half_life_hours: 336 },
          { id: 9, name: 'Drostanolone Propionate (Masteron)', type: 'injectable', half_life_hours: 19 },
          { id: 10, name: 'Drostanolone Enanthate (Masteron E)', type: 'injectable', half_life_hours: 120 },
          { id: 11, name: 'Methenolone Enanthate (Primobolan)', type: 'injectable', half_life_hours: 120 },
          
          // Orals (Steroids)
          { id: 12, name: 'Methandienone (Dianabol)', type: 'oral', half_life_hours: 4.5 },
          { id: 13, name: 'Oxandrolone (Anavar)', type: 'oral', half_life_hours: 9 },
          { id: 14, name: 'Stanozolol (Winstrol)', type: 'oral', half_life_hours: 9 },
          { id: 15, name: 'Oxymetholone (Anadrol)', type: 'oral', half_life_hours: 8.5 },
          { id: 16, name: 'Turinabol', type: 'oral', half_life_hours: 16 },

          // Peptides
          { id: 17, name: 'HGH (Human Growth Hormone)', type: 'peptide', half_life_hours: 3 },
          { id: 18, name: 'BPC-157', type: 'peptide', half_life_hours: 4 },
          { id: 19, name: 'TB-500', type: 'peptide', half_life_hours: 24 },
          { id: 20, name: 'Ipamorelin', type: 'peptide', half_life_hours: 2 },
          { id: 21, name: 'CJC-1295 (DAC)', type: 'peptide', half_life_hours: 144 },
          { id: 22, name: 'CJC-1295 (No DAC)', type: 'peptide', half_life_hours: 0.5 },
          { id: 23, name: 'HCG', type: 'peptide', half_life_hours: 36 },
        ];
        saveWebData(WEB_STORAGE_KEY_COMPOUNDS, compounds);
    }
    return compounds.sort((a, b) => a.name.localeCompare(b.name));
};

export const addCompound = async (name: string, type: 'injectable' | 'oral' | 'peptide', halfLifeHours: number) => {
    const compounds = getWebData(WEB_STORAGE_KEY_COMPOUNDS);
    const newCompound = {
        id: Date.now(),
        name,
        type,
        half_life_hours: halfLifeHours,
        created_at: new Date().toISOString()
    };
    compounds.push(newCompound);
    saveWebData(WEB_STORAGE_KEY_COMPOUNDS, compounds);
};

// Cycle Compounds
export const getCycleCompounds = async (cycleId: number) => {
    const cycleCompounds = getWebData(WEB_STORAGE_KEY_CYCLE_COMPOUNDS);
    const compounds = await getCompounds();
    const compoundMap = new Map(compounds.map(c => [c.id, c]));
    
    return cycleCompounds
        .filter(cc => cc.cycle_id === cycleId)
        .map(cc => ({
            ...cc,
            half_life_hours: compoundMap.get(cc.compound_id)?.half_life_hours || 24
        }))
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
};

export const addCycleCompound = async (
  cycleId: number, 
  compoundId: number, 
  name: string, 
  amount: number, 
  amountUnit: 'mg' | 'iu' | 'mcg', 
  dosingPeriod: number, 
  startDate: string, 
  endDate: string
) => {
    const cycleCompounds = getWebData(WEB_STORAGE_KEY_CYCLE_COMPOUNDS);
    const newCC = {
        id: Date.now(),
        cycle_id: cycleId,
        compound_id: compoundId,
        name,
        amount,
        amount_unit: amountUnit,
        dosing_period: dosingPeriod,
        start_date: startDate,
        end_date: endDate,
        created_at: new Date().toISOString()
    };
    cycleCompounds.push(newCC);
    saveWebData(WEB_STORAGE_KEY_CYCLE_COMPOUNDS, cycleCompounds);
};

export const deleteCycleCompound = async (id: number) => {
    const cycleCompounds = getWebData(WEB_STORAGE_KEY_CYCLE_COMPOUNDS);
    saveWebData(WEB_STORAGE_KEY_CYCLE_COMPOUNDS, cycleCompounds.filter(cc => cc.id !== id));
};

export const updateCycleCompound = async (
  id: number, 
  amount: number, 
  amountUnit: 'mg' | 'iu' | 'mcg', 
  dosingPeriod: number, 
  startDate: string, 
  endDate: string
) => {
    const cycleCompounds = getWebData(WEB_STORAGE_KEY_CYCLE_COMPOUNDS);
    const cc = cycleCompounds.find(c => c.id === id);
    if (cc) {
        cc.amount = amount;
        cc.amount_unit = amountUnit;
        cc.dosing_period = dosingPeriod;
        cc.start_date = startDate;
        cc.end_date = endDate;
        saveWebData(WEB_STORAGE_KEY_CYCLE_COMPOUNDS, cycleCompounds);
    }
};
