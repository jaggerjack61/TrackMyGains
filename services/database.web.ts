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
