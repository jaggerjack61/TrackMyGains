// Web implementation using localStorage
const WEB_STORAGE_KEY_WEIGHTS = 'trackmygains_weights';
const WEB_STORAGE_KEY_ROUTINES = 'trackmygains_routines';
const WEB_STORAGE_KEY_WORKOUTS = 'trackmygains_workouts';
const WEB_STORAGE_KEY_EXERCISES = 'trackmygains_exercises';

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
  return getWebData(WEB_STORAGE_KEY_ROUTINES).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const addRoutine = async (name: string) => {
  const routines = getWebData(WEB_STORAGE_KEY_ROUTINES);
  const newRoutine = {
    id: Date.now(),
    name,
    created_at: new Date().toISOString()
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

// Workouts
export const getWorkouts = async (routineId: number) => {
  return getWebData(WEB_STORAGE_KEY_WORKOUTS)
    .filter(w => w.routine_id === routineId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addWorkout = async (routineId: number, name: string) => {
  const workouts = getWebData(WEB_STORAGE_KEY_WORKOUTS);
  const newWorkout = {
    id: Date.now(),
    routine_id: routineId,
    name,
    date: new Date().toISOString(),
    created_at: new Date().toISOString()
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
};
