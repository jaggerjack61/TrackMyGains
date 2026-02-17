import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
// @ts-ignore
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

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
      db = await SQLite.openDatabaseAsync("trackmygains.db");
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS weights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          weight REAL NOT NULL,
          date TEXT NOT NULL,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS routines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          routine_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
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
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS diets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS daily_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          diet_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
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
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (daily_log_id) REFERENCES daily_logs (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS cycles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS compounds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT CHECK(type IN ('injectable', 'oral', 'peptide')) NOT NULL,
          half_life_hours REAL NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS cycle_compounds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cycle_id INTEGER NOT NULL,
          compound_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          amount_unit TEXT CHECK(amount_unit IN ('mg', 'iu', 'mcg')) NOT NULL,
          dosing_period INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cycle_id) REFERENCES cycles (id) ON DELETE CASCADE,
          FOREIGN KEY (compound_id) REFERENCES compounds (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          collection_name TEXT NOT NULL UNIQUE,
          last_sync_timestamp TEXT NOT NULL
        );
      `);

      const defaultCompounds = [
        // Injectables (Steroids)
        {
          name: "Testosterone Enanthate",
          type: "injectable",
          half_life_hours: 108,
        }, // ~4.5 days
        {
          name: "Testosterone Cypionate",
          type: "injectable",
          half_life_hours: 120,
        }, // ~5 days
        {
          name: "Testosterone Propionate",
          type: "injectable",
          half_life_hours: 19,
        }, // ~0.8 days
        {
          name: "Testosterone Phenylpropionate",
          type: "injectable",
          half_life_hours: 72,
        },
        {
          name: "Testosterone Isocaproate",
          type: "injectable",
          half_life_hours: 216,
        },
        {
          name: "Testosterone Decanoate",
          type: "injectable",
          half_life_hours: 312,
        },
        {
          name: "Testosterone Undecanoate",
          type: "injectable",
          half_life_hours: 480,
        },
        {
          name: "Sustanon (Testosterone Blend)",
          type: "injectable",
          half_life_hours: 168,
        },
        {
          name: "Testosterone Suspension",
          type: "injectable",
          half_life_hours: 1,
        },
        {
          name: "Nandrolone Decanoate (Deca)",
          type: "injectable",
          half_life_hours: 144,
        }, // ~6 days
        {
          name: "Nandrolone Phenylpropionate (NPP)",
          type: "injectable",
          half_life_hours: 27,
        }, // ~1.1 days
        {
          name: "Nandrolone Undecanoate",
          type: "injectable",
          half_life_hours: 360,
        },
        { name: "Trenbolone Acetate", type: "injectable", half_life_hours: 24 }, // ~1 day
        {
          name: "Trenbolone Enanthate",
          type: "injectable",
          half_life_hours: 120,
        }, // ~5 days
        {
          name: "Trenbolone Hexahydrobenzylcarbonate (Parabolan)",
          type: "injectable",
          half_life_hours: 168,
        },
        {
          name: "Boldenone Undecylenate (Equipoise)",
          type: "injectable",
          half_life_hours: 336,
        }, // ~14 days
        {
          name: "Boldenone Cypionate",
          type: "injectable",
          half_life_hours: 192,
        },
        {
          name: "Drostanolone Propionate (Masteron)",
          type: "injectable",
          half_life_hours: 19,
        }, // ~0.8 days
        {
          name: "Drostanolone Enanthate (Masteron E)",
          type: "injectable",
          half_life_hours: 120,
        }, // ~5 days
        {
          name: "Methenolone Enanthate (Primobolan)",
          type: "injectable",
          half_life_hours: 120,
        }, // ~5 days
        {
          name: "Methenolone Acetate (Primobolan)",
          type: "injectable",
          half_life_hours: 48,
        },
        {
          name: "Stanozolol (Injectable)",
          type: "injectable",
          half_life_hours: 24,
        },

        // Orals (Steroids)
        {
          name: "Methandienone (Dianabol)",
          type: "oral",
          half_life_hours: 4.5,
        },
        { name: "Oxandrolone (Anavar)", type: "oral", half_life_hours: 9 },
        { name: "Stanozolol (Winstrol)", type: "oral", half_life_hours: 9 },
        { name: "Oxymetholone (Anadrol)", type: "oral", half_life_hours: 8.5 },
        { name: "Turinabol", type: "oral", half_life_hours: 16 },
        {
          name: "Methenolone Acetate (Primobolan Oral)",
          type: "oral",
          half_life_hours: 6,
        },
        { name: "Mesterolone (Proviron)", type: "oral", half_life_hours: 12 },
        {
          name: "Fluoxymesterone (Halotestin)",
          type: "oral",
          half_life_hours: 9,
        },
        {
          name: "Methyldrostanolone (Superdrol)",
          type: "oral",
          half_life_hours: 8,
        },

        // Peptides
        {
          name: "HGH (Human Growth Hormone)",
          type: "peptide",
          half_life_hours: 3,
        }, // Very short, active life varies
        { name: "BPC-157", type: "peptide", half_life_hours: 4 },
        { name: "TB-500", type: "peptide", half_life_hours: 24 }, // varies significantly
        { name: "Ipamorelin", type: "peptide", half_life_hours: 2 },
        { name: "CJC-1295 (DAC)", type: "peptide", half_life_hours: 144 }, // ~6 days
        { name: "CJC-1295 (No DAC)", type: "peptide", half_life_hours: 0.5 },
        { name: "HCG", type: "peptide", half_life_hours: 36 }, // ~1.5 days
        { name: "Semaglutide", type: "peptide", half_life_hours: 168 },
        { name: "Tirzepatide", type: "peptide", half_life_hours: 120 },
        { name: "Liraglutide", type: "peptide", half_life_hours: 13 },
        { name: "Tesamorelin", type: "peptide", half_life_hours: 2 },
        { name: "Sermorelin", type: "peptide", half_life_hours: 0.5 },
        { name: "GHRP-2", type: "peptide", half_life_hours: 0.5 },
        { name: "GHRP-6", type: "peptide", half_life_hours: 0.5 },
        { name: "Hexarelin", type: "peptide", half_life_hours: 0.5 },
        { name: "IGF-1 LR3", type: "peptide", half_life_hours: 20 },
        { name: "Melanotan II", type: "peptide", half_life_hours: 36 },
        {
          name: "PT-141 (Bremelanotide)",
          type: "peptide",
          half_life_hours: 12,
        },
        { name: "Thymosin Alpha-1", type: "peptide", half_life_hours: 2 },
        { name: "Epitalon", type: "peptide", half_life_hours: 1 },
        { name: "AOD-9604", type: "peptide", half_life_hours: 8 },
      ];

      // Preload compounds if empty
      const compoundsCount = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM compounds",
      );
      if (compoundsCount && compoundsCount.count === 0) {
        for (const compound of defaultCompounds) {
          await db.runAsync(
            "INSERT INTO compounds (name, type, half_life_hours) VALUES (?, ?, ?)",
            compound.name,
            compound.type,
            compound.half_life_hours,
          );
        }
        console.log("Preloaded compounds data");
      } else {
        const existing = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM compounds",
        );
        const existingNames = new Set(existing.map((r) => r.name));

        for (const compound of defaultCompounds) {
          if (existingNames.has(compound.name)) continue;
          await db.runAsync(
            "INSERT INTO compounds (name, type, half_life_hours) VALUES (?, ?, ?)",
            compound.name,
            compound.type,
            compound.half_life_hours,
          );
        }
      }

      // Migration to add sort_order if it doesn't exist (simplified check)
      try {
        await db.execAsync(
          "ALTER TABLE routines ADD COLUMN sort_order INTEGER DEFAULT 0;",
        );
      } catch (e) {
        // Ignore error if column already exists
      }
      try {
        await db.execAsync(
          "ALTER TABLE workouts ADD COLUMN sort_order INTEGER DEFAULT 0;",
        );
      } catch (e) {
        // Ignore error if column already exists
      }
      try {
        await db.execAsync(
          "ALTER TABLE diets ADD COLUMN sort_order INTEGER DEFAULT 0;",
        );
      } catch (e) {
        // Ignore error if column already exists
      }

      // Migration to add last_modified columns
      const tables = [
        "weights",
        "routines",
        "workouts",
        "exercises",
        "exercise_logs",
        "diets",
        "daily_logs",
        "meals",
        "cycles",
        "compounds",
        "cycle_compounds",
      ];

      for (const table of tables) {
        try {
          await db.execAsync(
            `ALTER TABLE ${table} ADD COLUMN last_modified TEXT DEFAULT CURRENT_TIMESTAMP;`,
          );
          // Set last_modified for existing records to current timestamp
          await db.execAsync(
            `UPDATE ${table} SET last_modified = CURRENT_TIMESTAMP WHERE last_modified IS NULL;`,
          );
          console.log(`Added last_modified column to ${table}`);
        } catch (e) {
          // Ignore error if column already exists
        }
      }

      console.log("Database initialized");
    } catch (error) {
      console.error("Error initializing database:", error);
      db = null; // Reset db on failure so we can try again
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  await initPromise;
};

const requireDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) await initDatabase();
  if (!db) throw new Error("Database not initialized");
  return db;
};

const queryAll = async <T>(
  errorMessage: string,
  sql: string,
  ...params: any[]
): Promise<T[]> => {
  try {
    const database = await requireDatabase();
    return await database.getAllAsync<T>(sql, ...params);
  } catch (error) {
    console.error(errorMessage, error);
    return [];
  }
};

const queryFirst = async <T>(
  errorMessage: string,
  sql: string,
  ...params: any[]
): Promise<T | null> => {
  try {
    const database = await requireDatabase();
    return await database.getFirstAsync<T>(sql, ...params);
  } catch (error) {
    console.error(errorMessage, error);
    return null;
  }
};

const execute = async (errorMessage: string, sql: string, ...params: any[]) => {
  try {
    const database = await requireDatabase();
    await database.runAsync(sql, ...params);
  } catch (error) {
    console.error(errorMessage, error);
    throw error;
  }
};

const executeReturningId = async (
  errorMessage: string,
  sql: string,
  ...params: any[]
): Promise<number> => {
  try {
    const database = await requireDatabase();
    const result = await database.runAsync(sql, ...params);
    return result.lastInsertRowId;
  } catch (error) {
    console.error(errorMessage, error);
    throw error;
  }
};

const executeTransaction = async (
  errorMessage: string,
  fn: (database: SQLite.SQLiteDatabase) => Promise<void>,
) => {
  try {
    const database = await requireDatabase();
    await database.withTransactionAsync(async () => {
      await fn(database);
    });
  } catch (error) {
    console.error(errorMessage, error);
    throw error;
  }
};

export const addWeight = async (weight: number, date: string) => {
  await execute(
    "Error adding weight:",
    "INSERT INTO weights (weight, date) VALUES (?, ?)",
    weight,
    date,
  );
};

export const getWeights = async () => {
  return await queryAll<{ id: number; weight: number; date: string }>(
    "Error getting weights:",
    "SELECT * FROM weights ORDER BY date DESC",
  );
};

export const deleteWeight = async (id: number) => {
  await execute(
    "Error deleting weight:",
    "DELETE FROM weights WHERE id = ?",
    id,
  );
};

export const getRoutines = async () => {
  return await queryAll<{
    id: number;
    name: string;
    created_at: string;
    sort_order: number;
  }>(
    "Error getting routines:",
    "SELECT * FROM routines ORDER BY sort_order ASC, created_at DESC",
  );
};

export const addRoutine = async (name: string) => {
  try {
    const database = await requireDatabase();
    const result = await database.getFirstAsync<{ max_order: number }>(
      "SELECT MAX(sort_order) as max_order FROM routines",
    );
    const nextOrder = (result?.max_order ?? 0) + 1;
    await database.runAsync(
      "INSERT INTO routines (name, sort_order) VALUES (?, ?)",
      name,
      nextOrder,
    );
  } catch (error) {
    console.error("Error adding routine:", error);
    throw error;
  }
};

export const deleteRoutine = async (id: number) => {
  await execute(
    "Error deleting routine:",
    "DELETE FROM routines WHERE id = ?",
    id,
  );
};

export const updateRoutineOrder = async (
  routines: { id: number; sort_order: number }[],
) => {
  await executeTransaction(
    "Error updating routine order:",
    async (database) => {
      for (let i = 0; i < routines.length; i++) {
        const routine = routines[i];
        await database.runAsync(
          "UPDATE routines SET sort_order = ? WHERE id = ?",
          i,
          routine.id,
        );
      }
    },
  );
};

export const updateRoutine = async (id: number, name: string) => {
  await execute(
    "Error updating routine:",
    "UPDATE routines SET name = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
    name,
    id,
  );
};

export const getWorkouts = async (routineId: number) => {
  return await queryAll<{
    id: number;
    routine_id: number;
    name: string;
    date: string;
    created_at: string;
    sort_order: number;
  }>(
    "Error getting workouts:",
    "SELECT * FROM workouts WHERE routine_id = ? ORDER BY sort_order ASC, created_at DESC",
    routineId,
  );
};

export const addWorkout = async (routineId: number, name: string) => {
  try {
    const database = await requireDatabase();
    const date = new Date().toISOString();
    const result = await database.getFirstAsync<{ max_order: number }>(
      "SELECT MAX(sort_order) as max_order FROM workouts WHERE routine_id = ?",
      routineId,
    );
    const nextOrder = (result?.max_order ?? 0) + 1;
    await database.runAsync(
      "INSERT INTO workouts (routine_id, name, date, sort_order) VALUES (?, ?, ?, ?)",
      routineId,
      name,
      date,
      nextOrder,
    );
  } catch (error) {
    console.error("Error adding workout:", error);
    throw error;
  }
};

export const deleteWorkout = async (id: number) => {
  await execute(
    "Error deleting workout:",
    "DELETE FROM workouts WHERE id = ?",
    id,
  );
};

export const updateWorkoutOrder = async (
  workouts: { id: number; sort_order: number }[],
) => {
  await executeTransaction(
    "Error updating workout order:",
    async (database) => {
      for (let i = 0; i < workouts.length; i++) {
        const workout = workouts[i];
        await database.runAsync(
          "UPDATE workouts SET sort_order = ? WHERE id = ?",
          i,
          workout.id,
        );
      }
    },
  );
};

export const updateWorkout = async (id: number, name: string) => {
  await execute(
    "Error updating workout:",
    "UPDATE workouts SET name = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
    name,
    id,
  );
};

export const getExercises = async (workoutId: number) => {
  return await queryAll<{
    id: number;
    workout_id: number;
    name: string;
    created_at: string;
  }>(
    "Error getting exercises:",
    "SELECT * FROM exercises WHERE workout_id = ? ORDER BY created_at ASC",
    workoutId,
  );
};

export const addExercise = async (workoutId: number, name: string) => {
  await execute(
    "Error adding exercise:",
    "INSERT INTO exercises (workout_id, name) VALUES (?, ?)",
    workoutId,
    name,
  );
};

export const deleteExercise = async (id: number) => {
  await execute(
    "Error deleting exercise:",
    "DELETE FROM exercises WHERE id = ?",
    id,
  );
};

export const updateExercise = async (id: number, name: string) => {
  await execute(
    "Error updating exercise:",
    "UPDATE exercises SET name = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
    name,
    id,
  );
};

export const getExerciseLogs = async (exerciseId: number) => {
  return await queryAll<{
    id: number;
    exercise_id: number;
    date: string;
    weight: number;
    weight_unit: "kg" | "lbs";
    reps: number;
    sets: number;
    created_at: string;
  }>(
    "Error getting exercise logs:",
    "SELECT * FROM exercise_logs WHERE exercise_id = ? ORDER BY date DESC, created_at DESC",
    exerciseId,
  );
};

export const addExerciseLog = async (
  exerciseId: number,
  date: string,
  weight: number,
  weightUnit: "kg" | "lbs",
  reps: number,
  sets: number,
) => {
  await execute(
    "Error adding exercise log:",
    "INSERT INTO exercise_logs (exercise_id, date, weight, weight_unit, reps, sets) VALUES (?, ?, ?, ?, ?, ?)",
    exerciseId,
    date,
    weight,
    weightUnit,
    reps,
    sets,
  );
};

export const deleteExerciseLog = async (id: number) => {
  await execute(
    "Error deleting exercise log:",
    "DELETE FROM exercise_logs WHERE id = ?",
    id,
  );
};

export const updateExerciseLog = async (
  id: number,
  date: string,
  weight: number,
  weightUnit: "kg" | "lbs",
  reps: number,
  sets: number,
) => {
  await execute(
    "Error updating exercise log:",
    "UPDATE exercise_logs SET date = ?, weight = ?, weight_unit = ?, reps = ?, sets = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
    date,
    weight,
    weightUnit,
    reps,
    sets,
    id,
  );
};

export const exportDatabase = async () => {
  if (Platform.OS === "web") return;
  const database = await requireDatabase();
  await database.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");

  const cacheDir =
    FileSystem.Paths.cache?.uri ||
    FileSystem.Paths.document?.uri ||
    FileSystemLegacy.documentDirectory;
  if (!cacheDir) {
    throw new Error("Document directory is not available");
  }

  const exportFileName = "trackmygains_backup.db";
  const exportUri = `${cacheDir}${exportFileName}`;
  const exportPath = exportUri.replace(/^file:\/\//, "").replace(/'/g, "''");

  const existingExport = await FileSystemLegacy.getInfoAsync(exportUri);
  if (existingExport.exists) {
    await FileSystemLegacy.deleteAsync(exportUri, { idempotent: true });
  }

  await database.execAsync(`VACUUM INTO '${exportPath}'`);

  try {
    if (Platform.OS === "android") {
      const permissions =
        await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (permissions.granted) {
        const base64 = await FileSystemLegacy.readAsStringAsync(exportUri, {
          encoding: FileSystemLegacy.EncodingType.Base64,
        });

        await FileSystemLegacy.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          exportFileName,
          "application/x-sqlite3",
        )
          .then(async (uri) => {
            await FileSystemLegacy.writeAsStringAsync(uri, base64, {
              encoding: FileSystemLegacy.EncodingType.Base64,
            });
          })
          .catch((e) => {
            console.log(e);
            throw new Error("Failed to save file");
          });
      }
    } else {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(exportUri, {
          dialogTitle: "Export Database",
          UTI: "public.database",
          mimeType: "application/x-sqlite3",
        });
      } else {
        throw new Error("Sharing is not available on this device");
      }
    }
  } finally {
    const tempInfo = await FileSystemLegacy.getInfoAsync(exportUri);
    if (tempInfo.exists) {
      await FileSystemLegacy.deleteAsync(exportUri, { idempotent: true });
    }
  }
};

export const importDatabase = async () => {
  if (Platform.OS === "web") return;

  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: "*/*",
  });

  if (result.canceled) return;

  const { uri } = result.assets[0];

  if (db) {
    await db.closeAsync();
    db = null;
    initPromise = null;
  }

  const docDir =
    FileSystem.Paths.document?.uri || FileSystemLegacy.documentDirectory;
  if (!docDir) {
    throw new Error("Document directory is not available");
  }

  const dbName = "trackmygains.db";
  const dbDir = `${docDir}SQLite/`;
  const dbPath = `${dbDir}${dbName}`;

  if (!(await FileSystemLegacy.getInfoAsync(dbDir)).exists) {
    await FileSystemLegacy.makeDirectoryAsync(dbDir, { intermediates: true });
  }

  await FileSystemLegacy.copyAsync({
    from: uri,
    to: dbPath,
  });

  await initDatabase();
};

export const getDiets = async () => {
  return await queryAll<{
    id: number;
    name: string;
    created_at: string;
    sort_order: number;
  }>(
    "Error getting diets:",
    "SELECT * FROM diets ORDER BY sort_order ASC, created_at DESC",
  );
};

export const addDiet = async (name: string) => {
  try {
    const database = await requireDatabase();
    const result = await database.getFirstAsync<{ max_order: number }>(
      "SELECT MAX(sort_order) as max_order FROM diets",
    );
    const nextOrder = (result?.max_order ?? 0) + 1;
    await database.runAsync(
      "INSERT INTO diets (name, sort_order) VALUES (?, ?)",
      name,
      nextOrder,
    );
  } catch (error) {
    console.error("Error adding diet:", error);
    throw error;
  }
};

export const deleteDiet = async (id: number) => {
  await execute("Error deleting diet:", "DELETE FROM diets WHERE id = ?", id);
};

export const updateDietOrder = async (
  diets: { id: number; sort_order: number }[],
) => {
  await executeTransaction("Error updating diet order:", async (database) => {
    for (let i = 0; i < diets.length; i++) {
      const diet = diets[i];
      await database.runAsync(
        "UPDATE diets SET sort_order = ? WHERE id = ?",
        i,
        diet.id,
      );
    }
  });
};

export const updateDiet = async (id: number, name: string) => {
  await execute(
    "Error updating diet:",
    "UPDATE diets SET name = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
    name,
    id,
  );
};

export const getDailyLogs = async (dietId: number) => {
  return await queryAll<{
    id: number;
    diet_id: number;
    date: string;
    created_at: string;
  }>(
    "Error getting daily logs:",
    "SELECT * FROM daily_logs WHERE diet_id = ? ORDER BY date DESC",
    dietId,
  );
};

export const getDailyLogByDate = async (dietId: number, date: string) => {
  return await queryFirst<{
    id: number;
    diet_id: number;
    date: string;
    created_at: string;
  }>(
    "Error getting daily log by date:",
    "SELECT * FROM daily_logs WHERE diet_id = ? AND date = ?",
    dietId,
    date,
  );
};

export const addDailyLog = async (dietId: number, date: string) => {
  return await executeReturningId(
    "Error adding daily log:",
    "INSERT INTO daily_logs (diet_id, date) VALUES (?, ?)",
    dietId,
    date,
  );
};

export const deleteDailyLog = async (id: number) => {
  await execute(
    "Error deleting daily log:",
    "DELETE FROM daily_logs WHERE id = ?",
    id,
  );
};

export const getMeals = async (dailyLogId: number) => {
  return await queryAll<{
    id: number;
    daily_log_id: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    created_at: string;
  }>(
    "Error getting meals:",
    "SELECT * FROM meals WHERE daily_log_id = ? ORDER BY created_at ASC",
    dailyLogId,
  );
};

export const addMeal = async (
  dailyLogId: number,
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
) => {
  await execute(
    "Error adding meal:",
    "INSERT INTO meals (daily_log_id, name, calories, protein, carbs, fats) VALUES (?, ?, ?, ?, ?, ?)",
    dailyLogId,
    name,
    calories,
    protein,
    carbs,
    fats,
  );
};

export const deleteMeal = async (id: number) => {
  await execute("Error deleting meal:", "DELETE FROM meals WHERE id = ?", id);
};

export const updateMeal = async (
  id: number,
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
) => {
  await execute(
    "Error updating meal:",
    "UPDATE meals SET name = ?, calories = ?, protein = ?, carbs = ?, fats = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
    name,
    calories,
    protein,
    carbs,
    fats,
    id,
  );
};

export const getRecentMeals = async (query: string) => {
  return await queryAll<{
    id: number;
    daily_log_id: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    created_at: string;
  }>(
    "Error getting recent meals:",
    `SELECT * FROM meals 
     WHERE id IN (
       SELECT MAX(id) 
       FROM meals 
       WHERE name LIKE ? 
       GROUP BY name
     ) 
     ORDER BY created_at DESC 
     LIMIT 5`,
    `%${query}%`,
  );
};

export const getCycles = async () => {
  return await queryAll<{
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    created_at: string;
  }>("Error getting cycles:", "SELECT * FROM cycles ORDER BY start_date DESC");
};

export const getCycle = async (id: number) => {
  return await queryFirst<{
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    created_at: string;
  }>("Error getting cycle:", "SELECT * FROM cycles WHERE id = ?", id);
};

export const addCycle = async (
  name: string,
  startDate: string,
  endDate: string,
) => {
  await execute(
    "Error adding cycle:",
    "INSERT INTO cycles (name, start_date, end_date) VALUES (?, ?, ?)",
    name,
    startDate,
    endDate,
  );
};

export const deleteCycle = async (id: number) => {
  await execute("Error deleting cycle:", "DELETE FROM cycles WHERE id = ?", id);
};

export const updateCycle = async (
  id: number,
  name: string,
  startDate: string,
  endDate: string,
) => {
  await execute(
    "Error updating cycle:",
    "UPDATE cycles SET name = ?, start_date = ?, end_date = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
    name,
    startDate,
    endDate,
    id,
  );
};

export const getCompounds = async () => {
  return await queryAll<{
    id: number;
    name: string;
    type: "injectable" | "oral" | "peptide";
    half_life_hours: number;
    created_at: string;
  }>("Error getting compounds:", "SELECT * FROM compounds ORDER BY name ASC");
};

export const addCompound = async (
  name: string,
  type: "injectable" | "oral" | "peptide",
  halfLifeHours: number,
) => {
  await execute(
    "Error adding compound:",
    "INSERT INTO compounds (name, type, half_life_hours) VALUES (?, ?, ?)",
    name,
    type,
    halfLifeHours,
  );
};

export const getCycleCompounds = async (cycleId: number) => {
  return await queryAll<{
    id: number;
    cycle_id: number;
    compound_id: number;
    name: string;
    type: "injectable" | "oral" | "peptide";
    amount: number;
    amount_unit: "mg" | "iu" | "mcg";
    dosing_period: number;
    start_date: string;
    end_date: string;
    created_at: string;
    half_life_hours: number;
  }>(
    "Error getting cycle compounds:",
    `SELECT cc.*, c.half_life_hours, c.type
     FROM cycle_compounds cc
     JOIN compounds c ON cc.compound_id = c.id
     WHERE cc.cycle_id = ? 
     ORDER BY cc.start_date ASC`,
    cycleId,
  );
};

export const addCycleCompound = async (
  cycleId: number,
  compoundId: number,
  name: string,
  amount: number,
  amountUnit: "mg" | "iu" | "mcg",
  dosingPeriod: number,
  startDate: string,
  endDate: string,
) => {
  await execute(
    "Error adding cycle compound:",
    "INSERT INTO cycle_compounds (cycle_id, compound_id, name, amount, amount_unit, dosing_period, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    cycleId,
    compoundId,
    name,
    amount,
    amountUnit,
    dosingPeriod,
    startDate,
    endDate,
  );
};

export const deleteCycleCompound = async (id: number) => {
  await execute(
    "Error deleting cycle compound:",
    "DELETE FROM cycle_compounds WHERE id = ?",
    id,
  );
};

export const updateCycleCompound = async (
  id: number,
  amount: number,
  amountUnit: "mg" | "iu" | "mcg",
  dosingPeriod: number,
  startDate: string,
  endDate: string,
) => {
  await execute(
    "Error updating cycle compound:",
    "UPDATE cycle_compounds SET amount = ?, amount_unit = ?, dosing_period = ?, start_date = ?, end_date = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
    amount,
    amountUnit,
    dosingPeriod,
    startDate,
    endDate,
    id,
  );
};

// Sync metadata functions
export const getLastSyncTimestamp = async (
  collectionName: string,
): Promise<string | null> => {
  const result = await queryFirst<{ last_sync_timestamp: string }>(
    "Error getting last sync timestamp:",
    "SELECT last_sync_timestamp FROM sync_metadata WHERE collection_name = ?",
    collectionName,
  );
  return result?.last_sync_timestamp ?? null;
};

export const setLastSyncTimestamp = async (
  collectionName: string,
  timestamp: string,
) => {
  await execute(
    "Error setting last sync timestamp:",
    `INSERT INTO sync_metadata (collection_name, last_sync_timestamp) VALUES (?, ?)
     ON CONFLICT(collection_name) DO UPDATE SET last_sync_timestamp = ?`,
    collectionName,
    timestamp,
    timestamp,
  );
};

export const bulkInsertOrUpdate = async <T extends Record<string, any>>(
  tableName: string,
  records: T[],
) => {
  if (records.length === 0) return;

  await executeTransaction(
    `Error bulk inserting/updating ${tableName}:`,
    async (database) => {
      for (const record of records) {
        const columns = Object.keys(record).filter((key) => key !== "id");
        const values = columns.map((col) => record[col]);

        // Check if record exists
        const existing = await database.getFirstAsync<{ id: number }>(
          `SELECT id FROM ${tableName} WHERE id = ?`,
          record.id,
        );

        if (existing) {
          // Update existing record
          const setClause = columns.map((col) => `${col} = ?`).join(", ");
          await database.runAsync(
            `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
            ...values,
            record.id,
          );
        } else {
          // Insert new record
          const allColumns = ["id", ...columns];
          const allPlaceholders = allColumns.map(() => "?").join(", ");
          const allValues = [record.id, ...values];
          await database.runAsync(
            `INSERT INTO ${tableName} (${allColumns.join(", ")}) VALUES (${allPlaceholders})`,
            ...allValues,
          );
        }
      }
    },
  );
};

export const clearTable = async (tableName: string) => {
  await execute(
    `Error clearing table ${tableName}:`,
    `DELETE FROM ${tableName}`,
  );
};
