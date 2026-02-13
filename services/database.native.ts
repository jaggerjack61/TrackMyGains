import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export const initDatabase = async () => {
  if (db) return;
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync('trackmygains.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS weights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          weight REAL NOT NULL,
          date TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS routines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          routine_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS exercise_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exercise_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          weight REAL NOT NULL,
          weight_unit TEXT NOT NULL,
          reps INTEGER NOT NULL,
          sets INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS diets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS daily_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          diet_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (diet_id) REFERENCES diets (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS meals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          daily_log_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          calories INTEGER NOT NULL,
          protein REAL NOT NULL,
          carbs REAL NOT NULL,
          fats REAL NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (daily_log_id) REFERENCES daily_logs (id) ON DELETE CASCADE
        );
      `);
      
      // Migration to add sort_order if it doesn't exist (simplified check)
      try {
        await db.execAsync('ALTER TABLE routines ADD COLUMN sort_order INTEGER DEFAULT 0;');
      } catch (e) {
        // Ignore error if column already exists
      }
      try {
        await db.execAsync('ALTER TABLE workouts ADD COLUMN sort_order INTEGER DEFAULT 0;');
      } catch (e) {
        // Ignore error if column already exists
      }
      try {
        await db.execAsync('ALTER TABLE diets ADD COLUMN sort_order INTEGER DEFAULT 0;');
      } catch (e) {
        // Ignore error if column already exists
      }

      console.log('Database initialized');
    } catch (error) {
      console.error('Error initializing database:', error);
      db = null; // Reset db on failure so we can try again
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  await initPromise;
};

export const addWeight = async (weight: number, date: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('INSERT INTO weights (weight, date) VALUES (?, ?)', weight, date);
  } catch (error) {
    console.error('Error adding weight:', error);
    throw error;
  }
};

export const getWeights = async () => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    const result = await db.getAllAsync<{ id: number; weight: number; date: string }>(
      'SELECT * FROM weights ORDER BY date DESC'
    );
    return result;
  } catch (error) {
    console.error('Error getting weights:', error);
    return [];
  }
};

export const deleteWeight = async (id: number) => {
    try {
        if (!db) await initDatabase();
        if (!db) throw new Error('Database not initialized');
        await db.runAsync('DELETE FROM weights WHERE id = ?', id);
    } catch (error) {
        console.error('Error deleting weight:', error);
        throw error;
    }
}

// Routines
export const getRoutines = async () => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    return await db.getAllAsync<{ id: number; name: string; created_at: string; sort_order: number }>(
      'SELECT * FROM routines ORDER BY sort_order ASC, created_at DESC'
    );
  } catch (error) {
    console.error('Error getting routines:', error);
    return [];
  }
};

export const addRoutine = async (name: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    
    // Get max sort order
    const result = await db.getFirstAsync<{ max_order: number }>('SELECT MAX(sort_order) as max_order FROM routines');
    const nextOrder = (result?.max_order ?? 0) + 1;

    await db.runAsync('INSERT INTO routines (name, sort_order) VALUES (?, ?)', name, nextOrder);
  } catch (error) {
    console.error('Error adding routine:', error);
    throw error;
  }
};

export const deleteRoutine = async (id: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('DELETE FROM routines WHERE id = ?', id);
  } catch (error) {
    console.error('Error deleting routine:', error);
    throw error;
  }
};

export const updateRoutineOrder = async (routines: { id: number; sort_order: number }[]) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    
    await db.withTransactionAsync(async () => {
        for (let i = 0; i < routines.length; i++) {
            const routine = routines[i];
            // We use the index as the new sort order to ensure it matches the UI
            await db!.runAsync('UPDATE routines SET sort_order = ? WHERE id = ?', i, routine.id);
        }
    });
  } catch (error) {
    console.error('Error updating routine order:', error);
    throw error;
  }
};

export const updateRoutine = async (id: number, name: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('UPDATE routines SET name = ? WHERE id = ?', name, id);
  } catch (error) {
    console.error('Error updating routine:', error);
    throw error;
  }
};


// Workouts
export const getWorkouts = async (routineId: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    return await db.getAllAsync<{ id: number; routine_id: number; name: string; date: string; created_at: string; sort_order: number }>(
      'SELECT * FROM workouts WHERE routine_id = ? ORDER BY sort_order ASC, created_at DESC',
      routineId
    );
  } catch (error) {
    console.error('Error getting workouts:', error);
    return [];
  }
};

export const addWorkout = async (routineId: number, name: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    const date = new Date().toISOString();

    // Get max sort order
    const result = await db.getFirstAsync<{ max_order: number }>('SELECT MAX(sort_order) as max_order FROM workouts WHERE routine_id = ?', routineId);
    const nextOrder = (result?.max_order ?? 0) + 1;

    await db.runAsync('INSERT INTO workouts (routine_id, name, date, sort_order) VALUES (?, ?, ?, ?)', routineId, name, date, nextOrder);
  } catch (error) {
    console.error('Error adding workout:', error);
    throw error;
  }
};

export const deleteWorkout = async (id: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
  } catch (error) {
    console.error('Error deleting workout:', error);
    throw error;
  }
};

export const updateWorkoutOrder = async (workouts: { id: number; sort_order: number }[]) => {
    try {
      if (!db) await initDatabase();
      if (!db) throw new Error('Database not initialized');
      
      await db.withTransactionAsync(async () => {
          for (let i = 0; i < workouts.length; i++) {
              const workout = workouts[i];
              await db!.runAsync('UPDATE workouts SET sort_order = ? WHERE id = ?', i, workout.id);
          }
      });
    } catch (error) {
      console.error('Error updating workout order:', error);
      throw error;
    }
  };

export const updateWorkout = async (id: number, name: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('UPDATE workouts SET name = ? WHERE id = ?', name, id);
  } catch (error) {
    console.error('Error updating workout:', error);
    throw error;
  }
};

// Exercises
export const getExercises = async (workoutId: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    return await db.getAllAsync<{ id: number; workout_id: number; name: string; created_at: string }>(
      'SELECT * FROM exercises WHERE workout_id = ? ORDER BY created_at ASC',
      workoutId
    );
  } catch (error) {
    console.error('Error getting exercises:', error);
    return [];
  }
};

export const addExercise = async (workoutId: number, name: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('INSERT INTO exercises (workout_id, name) VALUES (?, ?)', workoutId, name);
  } catch (error) {
    console.error('Error adding exercise:', error);
    throw error;
  }
};

export const deleteExercise = async (id: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('DELETE FROM exercises WHERE id = ?', id);
  } catch (error) {
    console.error('Error deleting exercise:', error);
    throw error;
  }
};

export const updateExercise = async (id: number, name: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('UPDATE exercises SET name = ? WHERE id = ?', name, id);
  } catch (error) {
    console.error('Error updating exercise:', error);
    throw error;
  }
};

// Exercise Logs
export const getExerciseLogs = async (exerciseId: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    return await db.getAllAsync<{ id: number; exercise_id: number; date: string; weight: number; weight_unit: 'kg' | 'lbs'; reps: number; sets: number; created_at: string }>(
      'SELECT * FROM exercise_logs WHERE exercise_id = ? ORDER BY date DESC, created_at DESC',
      exerciseId
    );
  } catch (error) {
    console.error('Error getting exercise logs:', error);
    return [];
  }
};

export const addExerciseLog = async (exerciseId: number, date: string, weight: number, weightUnit: 'kg' | 'lbs', reps: number, sets: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync(
      'INSERT INTO exercise_logs (exercise_id, date, weight, weight_unit, reps, sets) VALUES (?, ?, ?, ?, ?, ?)',
      exerciseId, date, weight, weightUnit, reps, sets
    );
  } catch (error) {
    console.error('Error adding exercise log:', error);
    throw error;
  }
};

export const deleteExerciseLog = async (id: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('DELETE FROM exercise_logs WHERE id = ?', id);
  } catch (error) {
    console.error('Error deleting exercise log:', error);
    throw error;
  }
};

export const updateExerciseLog = async (id: number, date: string, weight: number, weightUnit: 'kg' | 'lbs', reps: number, sets: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync(
      'UPDATE exercise_logs SET date = ?, weight = ?, weight_unit = ?, reps = ?, sets = ? WHERE id = ?',
      date, weight, weightUnit, reps, sets, id
    );
  } catch (error) {
    console.error('Error updating exercise log:', error);
    throw error;
  }
};

// Diets
export const getDiets = async () => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    return await db.getAllAsync<{ id: number; name: string; created_at: string; sort_order: number }>(
      'SELECT * FROM diets ORDER BY sort_order ASC, created_at DESC'
    );
  } catch (error) {
    console.error('Error getting diets:', error);
    return [];
  }
};

export const addDiet = async (name: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    
    // Get max sort order
    const result = await db.getFirstAsync<{ max_order: number }>('SELECT MAX(sort_order) as max_order FROM diets');
    const nextOrder = (result?.max_order ?? 0) + 1;

    await db.runAsync('INSERT INTO diets (name, sort_order) VALUES (?, ?)', name, nextOrder);
  } catch (error) {
    console.error('Error adding diet:', error);
    throw error;
  }
};

export const deleteDiet = async (id: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('DELETE FROM diets WHERE id = ?', id);
  } catch (error) {
    console.error('Error deleting diet:', error);
    throw error;
  }
};

export const updateDietOrder = async (diets: { id: number; sort_order: number }[]) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    
    await db.withTransactionAsync(async () => {
        for (let i = 0; i < diets.length; i++) {
            const diet = diets[i];
            await db!.runAsync('UPDATE diets SET sort_order = ? WHERE id = ?', i, diet.id);
        }
    });
  } catch (error) {
    console.error('Error updating diet order:', error);
    throw error;
  }
};

export const updateDiet = async (id: number, name: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('UPDATE diets SET name = ? WHERE id = ?', name, id);
  } catch (error) {
    console.error('Error updating diet:', error);
    throw error;
  }
};

// Daily Logs
export const getDailyLogs = async (dietId: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    return await db.getAllAsync<{ id: number; diet_id: number; date: string; created_at: string }>(
      'SELECT * FROM daily_logs WHERE diet_id = ? ORDER BY date DESC',
      dietId
    );
  } catch (error) {
    console.error('Error getting daily logs:', error);
    return [];
  }
};

export const getDailyLogByDate = async (dietId: number, date: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    return await db.getFirstAsync<{ id: number; diet_id: number; date: string; created_at: string }>(
      'SELECT * FROM daily_logs WHERE diet_id = ? AND date = ?',
      dietId, date
    );
  } catch (error) {
    console.error('Error getting daily log by date:', error);
    return null;
  }
};

export const addDailyLog = async (dietId: number, date: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    const result = await db.runAsync('INSERT INTO daily_logs (diet_id, date) VALUES (?, ?)', dietId, date);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error adding daily log:', error);
    throw error;
  }
};

export const deleteDailyLog = async (id: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('DELETE FROM daily_logs WHERE id = ?', id);
  } catch (error) {
    console.error('Error deleting daily log:', error);
    throw error;
  }
};

// Meals
export const getMeals = async (dailyLogId: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    return await db.getAllAsync<{ id: number; daily_log_id: number; name: string; calories: number; protein: number; carbs: number; fats: number; created_at: string }>(
      'SELECT * FROM meals WHERE daily_log_id = ? ORDER BY created_at ASC',
      dailyLogId
    );
  } catch (error) {
    console.error('Error getting meals:', error);
    return [];
  }
};

export const addMeal = async (dailyLogId: number, name: string, calories: number, protein: number, carbs: number, fats: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync(
      'INSERT INTO meals (daily_log_id, name, calories, protein, carbs, fats) VALUES (?, ?, ?, ?, ?, ?)',
      dailyLogId, name, calories, protein, carbs, fats
    );
  } catch (error) {
    console.error('Error adding meal:', error);
    throw error;
  }
};

export const deleteMeal = async (id: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync('DELETE FROM meals WHERE id = ?', id);
  } catch (error) {
    console.error('Error deleting meal:', error);
    throw error;
  }
};

export const updateMeal = async (id: number, name: string, calories: number, protein: number, carbs: number, fats: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    await db.runAsync(
      'UPDATE meals SET name = ?, calories = ?, protein = ?, carbs = ?, fats = ? WHERE id = ?',
      name, calories, protein, carbs, fats, id
    );
  } catch (error) {
    console.error('Error updating meal:', error);
    throw error;
  }
};

export const getRecentMeals = async (query: string) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    // Use a subquery to ensure we get the most recent meal details for each unique name
    return await db.getAllAsync<{ id: number; daily_log_id: number; name: string; calories: number; protein: number; carbs: number; fats: number; created_at: string }>(
      `SELECT * FROM meals 
       WHERE id IN (
         SELECT MAX(id) 
         FROM meals 
         WHERE name LIKE ? 
         GROUP BY name
       ) 
       ORDER BY created_at DESC 
       LIMIT 5`,
      `%${query}%`
    );
  } catch (error) {
    console.error('Error getting recent meals:', error);
    return [];
  }
};
