export interface WeightRecord {
  id: number;
  weight: number;
  date: string;
}

export interface Routine {
  id: number;
  name: string;
  created_at: string;
  sort_order: number;
}

export interface Workout {
  id: number;
  routine_id: number;
  name: string;
  date: string;
  created_at: string;
  sort_order: number;
}

export interface Exercise {
  id: number;
  workout_id: number;
  name: string;
  created_at: string;
}

export interface ExerciseLog {
  id: number;
  exercise_id: number;
  date: string;
  weight: number;
  weight_unit: 'kg' | 'lbs';
  reps: number;
  sets: number;
  created_at: string;
}

export interface Diet {
  id: number;
  name: string;
  created_at: string;
  sort_order: number;
}

export interface DailyLog {
  id: number;
  diet_id: number;
  date: string;
  created_at: string;
}

export interface Meal {
  id: number;
  daily_log_id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
}

export interface Cycle {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Compound {
  id: number;
  name: string;
  type: 'injectable' | 'oral' | 'peptide';
  half_life_hours: number;
  created_at: string;
}

export interface CycleCompound {
  id: number;
  cycle_id: number;
  compound_id: number;
  name: string; // denormalized for easier access or custom names
  type: 'injectable' | 'oral' | 'peptide';
  amount: number;
  amount_unit: 'mg' | 'iu' | 'mcg';
  dosing_period: number; // in days, e.g., 7 for weekly
  start_date: string;
  end_date: string;
  half_life_hours: number; // Joined from compounds
  created_at: string;
}

export declare const initDatabase: () => Promise<void>;
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
export declare const addWorkout: (routineId: number, name: string) => Promise<void>;
export declare const deleteWorkout: (id: number) => Promise<void>;
export declare const updateWorkoutOrder: (workouts: Workout[]) => Promise<void>;
export declare const updateWorkout: (id: number, name: string) => Promise<void>;

// Exercises
export declare const getExercises: (workoutId: number) => Promise<Exercise[]>;
export declare const addExercise: (workoutId: number, name: string) => Promise<void>;
export declare const deleteExercise: (id: number) => Promise<void>;
export declare const updateExercise: (id: number, name: string) => Promise<void>;

// Exercise Logs
export declare const getExerciseLogs: (exerciseId: number) => Promise<ExerciseLog[]>;
export declare const addExerciseLog: (exerciseId: number, date: string, weight: number, weightUnit: 'kg' | 'lbs', reps: number, sets: number) => Promise<void>;
export declare const deleteExerciseLog: (id: number) => Promise<void>;
export declare const updateExerciseLog: (id: number, date: string, weight: number, weightUnit: 'kg' | 'lbs', reps: number, sets: number) => Promise<void>;

// Diets
export declare const getDiets: () => Promise<Diet[]>;
export declare const addDiet: (name: string) => Promise<void>;
export declare const deleteDiet: (id: number) => Promise<void>;

// Cycles
export declare const getCycles: () => Promise<Cycle[]>;
export declare const getCycle: (id: number) => Promise<Cycle | null>;
export declare const addCycle: (name: string, startDate: string, endDate: string) => Promise<void>;
export declare const deleteCycle: (id: number) => Promise<void>;
export declare const updateCycle: (id: number, name: string, startDate: string, endDate: string) => Promise<void>;

// Compounds (Reference Data)
export declare const getCompounds: () => Promise<Compound[]>;
export declare const addCompound: (name: string, type: 'injectable' | 'oral' | 'peptide', halfLifeHours: number) => Promise<void>;

// Cycle Compounds
export declare const getCycleCompounds: (cycleId: number) => Promise<CycleCompound[]>;
export declare const addCycleCompound: (
  cycleId: number, 
  compoundId: number, 
  name: string, 
  amount: number, 
  amountUnit: 'mg' | 'iu' | 'mcg', 
  dosingPeriod: number, 
  startDate: string, 
  endDate: string
) => Promise<void>;
export declare const deleteCycleCompound: (id: number) => Promise<void>;
export declare const updateCycleCompound: (
  id: number, 
  amount: number, 
  amountUnit: 'mg' | 'iu' | 'mcg', 
  dosingPeriod: number, 
  startDate: string, 
  endDate: string
) => Promise<void>;
export declare const updateDietOrder: (diets: Diet[]) => Promise<void>;
export declare const updateDiet: (id: number, name: string) => Promise<void>;

// Daily Logs
export declare const getDailyLogs: (dietId: number) => Promise<DailyLog[]>;
export declare const addDailyLog: (dietId: number, date: string) => Promise<number>; // Returns the ID of the new log
export declare const deleteDailyLog: (id: number) => Promise<void>;
export declare const getDailyLogByDate: (dietId: number, date: string) => Promise<DailyLog | null>;

// Meals
export declare const getMeals: (dailyLogId: number) => Promise<Meal[]>;
export declare const addMeal: (dailyLogId: number, name: string, calories: number, protein: number, carbs: number, fats: number) => Promise<void>;
export declare const deleteMeal: (id: number) => Promise<void>;
export declare const getRecentMeals: (query: string) => Promise<Meal[]>;
export declare const updateMeal: (id: number, name: string, calories: number, protein: number, carbs: number, fats: number) => Promise<void>;
