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
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          routine_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE
        );
      `);
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
    return await db.getAllAsync<{ id: number; name: string; created_at: string }>(
      'SELECT * FROM routines ORDER BY created_at DESC'
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
    await db.runAsync('INSERT INTO routines (name) VALUES (?)', name);
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

// Workouts
export const getWorkouts = async (routineId: number) => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('Database not initialized');
    return await db.getAllAsync<{ id: number; routine_id: number; name: string; date: string; created_at: string }>(
      'SELECT * FROM workouts WHERE routine_id = ? ORDER BY date DESC',
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
    await db.runAsync('INSERT INTO workouts (routine_id, name, date) VALUES (?, ?, ?)', routineId, name, date);
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
