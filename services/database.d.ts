export interface WeightRecord {
  id: number;
  weight: number;
  date: string;
}

export interface Routine {
  id: number;
  name: string;
  created_at: string;
}

export interface Workout {
  id: number;
  routine_id: number;
  name: string;
  date: string;
  created_at: string;
}

export interface Exercise {
  id: number;
  workout_id: number;
  name: string;
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

// Workouts
export declare const getWorkouts: (routineId: number) => Promise<Workout[]>;
export declare const addWorkout: (routineId: number, name: string) => Promise<void>;
export declare const deleteWorkout: (id: number) => Promise<void>;

// Exercises
export declare const getExercises: (workoutId: number) => Promise<Exercise[]>;
export declare const addExercise: (workoutId: number, name: string) => Promise<void>;
export declare const deleteExercise: (id: number) => Promise<void>;
