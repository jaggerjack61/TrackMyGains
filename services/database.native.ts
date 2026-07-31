import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
// @ts-ignore
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

import {
  SYNC_COLLECTIONS,
  SYNC_RELATIONSHIPS,
  getDailyLogSyncId,
  type SyncCollectionName,
  type SyncOutboxEntry,
  type SyncTombstone,
} from "@/services/sync-records";

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;
let databaseOperationQueue: Promise<unknown> = Promise.resolve();

const TABLE_BY_COLLECTION: Record<SyncCollectionName, string> = {
  weights: "weights",
  routines: "routines",
  workouts: "workouts",
  exercises: "exercises",
  exercise_logs: "exercise_logs",
  diets: "diets",
  daily_logs: "daily_logs",
  meals: "meals",
  cycles: "cycles",
  cycle_compounds: "cycle_compounds",
};

const COLLECTION_BY_TABLE = Object.fromEntries(
  Object.entries(TABLE_BY_COLLECTION).map(([collectionName, tableName]) => [
    tableName,
    collectionName,
  ]),
) as Record<string, SyncCollectionName>;

const LOCAL_COLUMNS_BY_COLLECTION: Record<
  SyncCollectionName,
  readonly string[]
> = {
  weights: ["sync_id", "weight", "date", "last_modified"],
  routines: ["sync_id", "name", "created_at", "sort_order", "last_modified"],
  workouts: [
    "sync_id",
    "routine_id",
    "name",
    "date",
    "created_at",
    "sort_order",
    "last_modified",
  ],
  exercises: ["sync_id", "workout_id", "name", "created_at", "last_modified"],
  exercise_logs: [
    "sync_id",
    "exercise_id",
    "date",
    "weight",
    "weight_unit",
    "reps",
    "sets",
    "created_at",
    "last_modified",
  ],
  diets: ["sync_id", "name", "created_at", "sort_order", "last_modified"],
  daily_logs: ["sync_id", "diet_id", "date", "created_at", "last_modified"],
  meals: [
    "sync_id",
    "daily_log_id",
    "name",
    "calories",
    "protein",
    "carbs",
    "fats",
    "created_at",
    "last_modified",
  ],
  cycles: [
    "sync_id",
    "name",
    "start_date",
    "end_date",
    "created_at",
    "last_modified",
  ],
  cycle_compounds: [
    "sync_id",
    "cycle_id",
    "compound_id",
    "name",
    "amount",
    "amount_unit",
    "dosing_period",
    "start_date",
    "end_date",
    "created_at",
    "last_modified",
  ],
};

const queueDatabaseOperation = async <T>(operation: () => Promise<T>) => {
  const queuedOperation = databaseOperationQueue.then(operation, operation);
  databaseOperationQueue = queuedOperation.catch(() => undefined);
  return await queuedOperation;
};

export const initDatabase = async () => {
  if (initPromise) {
    await initPromise;
    return;
  }
  if (db) return;

  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync("trackmygains.db");
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS weights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_id TEXT UNIQUE,
          weight REAL NOT NULL,
          date TEXT NOT NULL,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS routines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_id TEXT UNIQUE,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_id TEXT UNIQUE,
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
          sync_id TEXT UNIQUE,
          workout_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS exercise_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_id TEXT UNIQUE,
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
          sync_id TEXT UNIQUE,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS daily_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_id TEXT UNIQUE,
          diet_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (diet_id) REFERENCES diets (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS meals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_id TEXT UNIQUE,
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
          sync_id TEXT UNIQUE,
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
          sync_id TEXT UNIQUE,
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
          collection_name TEXT NOT NULL UNIQUE,
          last_sync_timestamp TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sync_tombstones (
          collection_name TEXT NOT NULL,
          sync_id TEXT NOT NULL,
          deleted_at TEXT NOT NULL,
          PRIMARY KEY (collection_name, sync_id)
        );
        CREATE TABLE IF NOT EXISTS sync_outbox (
          collection_name TEXT NOT NULL,
          sync_id TEXT NOT NULL,
          operation TEXT NOT NULL CHECK(operation IN ('upsert', 'delete')),
          changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (collection_name, sync_id)
        );
        CREATE TABLE IF NOT EXISTS apks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version_date TEXT NOT NULL,
          file_name TEXT,
          file_path TEXT,
          downloaded_at TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      const columnsByTable = new Map<string, Set<string>>();

      for (const table of tables) {
        const columns = await db.getAllAsync<{ name: string }>(
          `PRAGMA table_info(${table})`,
        );
        columnsByTable.set(table, new Set(columns.map((column) => column.name)));
      }

      for (const table of ["routines", "workouts", "diets"]) {
        if (!columnsByTable.get(table)?.has("sort_order")) {
          await db.execAsync(
            `ALTER TABLE ${table} ADD COLUMN sort_order INTEGER DEFAULT 0;`,
          );
        }
      }

      for (const table of tables) {
        if (!columnsByTable.get(table)?.has("last_modified")) {
          await db.execAsync(
            `ALTER TABLE ${table} ADD COLUMN last_modified TEXT;`,
          );
          await db.execAsync(
            `UPDATE ${table} SET last_modified = '1970-01-01 00:00:00' WHERE last_modified IS NULL;`,
          );
        }

        await db.execAsync(`
          CREATE TRIGGER IF NOT EXISTS set_${table}_last_modified_after_insert
          AFTER INSERT ON ${table}
          WHEN NEW.last_modified IS NULL
          BEGIN
            UPDATE ${table} SET last_modified = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END;
        `);
      }

      const apkColumns = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(apks)",
      );
      if (!apkColumns.some(column => column.name === "file_path")) {
        await db.execAsync("ALTER TABLE apks ADD COLUMN file_path TEXT;");
      }

      for (const collectionName of SYNC_COLLECTIONS) {
        const table = TABLE_BY_COLLECTION[collectionName];
        if (!columnsByTable.get(table)?.has("sync_id")) {
          await db.execAsync(`ALTER TABLE ${table} ADD COLUMN sync_id TEXT;`);
        }

        await db.runAsync(
          `UPDATE ${table}
           SET sync_id = ? || id
           WHERE sync_id IS NULL OR sync_id = ''`,
          `legacy:${collectionName}:`,
        );
        await db.execAsync(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_sync_id ON ${table}(sync_id);`,
        );
      }

      // Merge any legacy duplicate diet days before enforcing calendar-day uniqueness.
      await db.execAsync(`
        INSERT INTO sync_tombstones (collection_name, sync_id, deleted_at)
        SELECT 'daily_logs', duplicate.sync_id,
               STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
        FROM daily_logs duplicate
        WHERE duplicate.sync_id != (
          SELECT MIN(candidate.sync_id)
          FROM daily_logs candidate
          WHERE candidate.diet_id = duplicate.diet_id
            AND candidate.date = duplicate.date
        )
        ON CONFLICT(collection_name, sync_id) DO UPDATE SET
          deleted_at = excluded.deleted_at;

        INSERT INTO sync_outbox (collection_name, sync_id, operation, changed_at)
        SELECT 'daily_logs', duplicate.sync_id, 'delete',
               STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
        FROM daily_logs duplicate
        WHERE duplicate.sync_id != (
          SELECT MIN(candidate.sync_id)
          FROM daily_logs candidate
          WHERE candidate.diet_id = duplicate.diet_id
            AND candidate.date = duplicate.date
        )
        ON CONFLICT(collection_name, sync_id) DO UPDATE SET
          operation = 'delete',
          changed_at = excluded.changed_at;

        UPDATE meals
        SET daily_log_id = (
          SELECT matching.id
          FROM daily_logs current
          JOIN daily_logs matching
            ON matching.diet_id = current.diet_id
           AND matching.date = current.date
          WHERE current.id = meals.daily_log_id
          ORDER BY matching.sync_id ASC
          LIMIT 1
        )
        WHERE daily_log_id IN (SELECT id FROM daily_logs);

        DELETE FROM daily_logs
        WHERE sync_id != (
          SELECT MIN(candidate.sync_id)
          FROM daily_logs candidate
          WHERE candidate.diet_id = daily_logs.diet_id
            AND candidate.date = daily_logs.date
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_unique_date
          ON daily_logs(diet_id, date);
      `);

      for (const collectionName of SYNC_COLLECTIONS) {
        const table = TABLE_BY_COLLECTION[collectionName];
        await db.execAsync(`
          CREATE TRIGGER IF NOT EXISTS set_${table}_sync_id_after_insert
          AFTER INSERT ON ${table}
          WHEN NEW.sync_id IS NULL OR NEW.sync_id = ''
          BEGIN
            UPDATE ${table}
            SET sync_id = 'uuid:' || lower(hex(randomblob(16)))
            WHERE id = NEW.id;
          END;

          CREATE TRIGGER IF NOT EXISTS queue_${table}_sync_after_insert
          AFTER INSERT ON ${table}
          WHEN NEW.sync_id IS NOT NULL AND NEW.sync_id != ''
          BEGIN
            INSERT INTO sync_outbox (collection_name, sync_id, operation, changed_at)
            VALUES ('${collectionName}', NEW.sync_id, 'upsert', STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
            ON CONFLICT(collection_name, sync_id) DO UPDATE SET
              operation = 'upsert',
              changed_at = excluded.changed_at;
          END;

          CREATE TRIGGER IF NOT EXISTS queue_${table}_sync_after_update
          AFTER UPDATE ON ${table}
          WHEN NEW.sync_id IS NOT NULL AND NEW.sync_id != ''
          BEGIN
            INSERT INTO sync_outbox (collection_name, sync_id, operation, changed_at)
            VALUES ('${collectionName}', NEW.sync_id, 'upsert', STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
            ON CONFLICT(collection_name, sync_id) DO UPDATE SET
              operation = 'upsert',
              changed_at = excluded.changed_at;
          END;

          CREATE TRIGGER IF NOT EXISTS tombstone_${table}_before_delete
          BEFORE DELETE ON ${table}
          WHEN OLD.sync_id IS NOT NULL AND OLD.sync_id != ''
          BEGIN
            INSERT INTO sync_tombstones (collection_name, sync_id, deleted_at)
            VALUES ('${collectionName}', OLD.sync_id, STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
            ON CONFLICT(collection_name, sync_id) DO UPDATE SET
              deleted_at = excluded.deleted_at;
            INSERT INTO sync_outbox (collection_name, sync_id, operation, changed_at)
            VALUES ('${collectionName}', OLD.sync_id, 'delete', STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
            ON CONFLICT(collection_name, sync_id) DO UPDATE SET
              operation = 'delete',
              changed_at = excluded.changed_at;
          END;
        `);
      }

      const outboxBootstrap = await db.getFirstAsync<{ value: string }>(
        `SELECT last_sync_timestamp AS value
         FROM sync_metadata
         WHERE collection_name = '__outbox_schema_v1'`,
      );
      if (!outboxBootstrap) {
        for (const collectionName of SYNC_COLLECTIONS) {
          const table = TABLE_BY_COLLECTION[collectionName];
          await db.execAsync(`
            INSERT INTO sync_outbox (collection_name, sync_id, operation, changed_at)
            SELECT '${collectionName}', sync_id, 'upsert', CURRENT_TIMESTAMP
            FROM ${table}
            WHERE sync_id IS NOT NULL
            ON CONFLICT(collection_name, sync_id) DO UPDATE SET
              operation = 'upsert',
              changed_at = excluded.changed_at;
          `);
        }
        await db.runAsync(
          `INSERT INTO sync_metadata (collection_name, last_sync_timestamp)
           VALUES ('__outbox_schema_v1', '1')
           ON CONFLICT(collection_name) DO UPDATE SET last_sync_timestamp = '1'`,
        );
      }

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_weights_date ON weights(date DESC);
        CREATE INDEX IF NOT EXISTS idx_routines_order ON routines(sort_order, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_workouts_routine_order ON workouts(routine_id, sort_order, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_exercises_workout_created ON exercises(workout_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_date ON exercise_logs(exercise_id, date DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_diets_order ON diets(sort_order, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_daily_logs_diet_date ON daily_logs(diet_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_meals_daily_log_created ON meals(daily_log_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_cycles_start_date ON cycles(start_date DESC);
        CREATE INDEX IF NOT EXISTS idx_cycle_compounds_cycle_start ON cycle_compounds(cycle_id, start_date);
        CREATE INDEX IF NOT EXISTS idx_compounds_name ON compounds(name);
        CREATE INDEX IF NOT EXISTS idx_sync_outbox_changed
          ON sync_outbox(changed_at);
        CREATE INDEX IF NOT EXISTS idx_sync_tombstones_deleted
          ON sync_tombstones(deleted_at);
      `);

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
  if (initPromise) await initPromise;
  else if (!db) await initDatabase();
  if (!db) throw new Error("Database not initialized");
  return db;
};

const queryAll = async <T>(
  errorMessage: string,
  sql: string,
  ...params: any[]
): Promise<T[]> => {
  try {
    return await queueDatabaseOperation(async () => {
      const database = await requireDatabase();
      return await database.getAllAsync<T>(sql, ...params);
    });
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
    return await queueDatabaseOperation(async () => {
      const database = await requireDatabase();
      return await database.getFirstAsync<T>(sql, ...params);
    });
  } catch (error) {
    console.error(errorMessage, error);
    return null;
  }
};

const execute = async (errorMessage: string, sql: string, ...params: any[]) => {
  try {
    await queueDatabaseOperation(async () => {
      const database = await requireDatabase();
      await database.runAsync(sql, ...params);
    });
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
    await queueDatabaseOperation(async () => {
      const database = await requireDatabase();
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await fn(transaction);
      });
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
    await queueDatabaseOperation(async () => {
      const database = await requireDatabase();
      await database.withExclusiveTransactionAsync(async transaction => {
        const result = await transaction.getFirstAsync<{ max_order: number }>(
          "SELECT MAX(sort_order) as max_order FROM routines",
        );
        const nextOrder = (result?.max_order ?? 0) + 1;
        await transaction.runAsync(
          "INSERT INTO routines (name, sort_order) VALUES (?, ?)",
          name,
          nextOrder,
        );
      });
    });
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
          "UPDATE routines SET sort_order = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
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
    await queueDatabaseOperation(async () => {
      const database = await requireDatabase();
      await database.withExclusiveTransactionAsync(async transaction => {
        const date = new Date().toISOString();
        const result = await transaction.getFirstAsync<{ max_order: number }>(
          "SELECT MAX(sort_order) as max_order FROM workouts WHERE routine_id = ?",
          routineId,
        );
        const nextOrder = (result?.max_order ?? 0) + 1;
        await transaction.runAsync(
          "INSERT INTO workouts (routine_id, name, date, sort_order) VALUES (?, ?, ?, ?)",
          routineId,
          name,
          date,
          nextOrder,
        );
      });
    });
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
          "UPDATE workouts SET sort_order = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
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

  await queueDatabaseOperation(async () => {
    const database = await requireDatabase();
    await database.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");
    await database.execAsync(`VACUUM INTO '${exportPath}'`);
  });

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

  await queueDatabaseOperation(async () => {
    if (db) {
      await db.closeAsync();
      db = null;
      initPromise = null;
    }

    await FileSystemLegacy.copyAsync({
      from: uri,
      to: dbPath,
    });
    await initDatabase();
  });
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
    await queueDatabaseOperation(async () => {
      const database = await requireDatabase();
      await database.withExclusiveTransactionAsync(async transaction => {
        const result = await transaction.getFirstAsync<{ max_order: number }>(
          "SELECT MAX(sort_order) as max_order FROM diets",
        );
        const nextOrder = (result?.max_order ?? 0) + 1;
        await transaction.runAsync(
          "INSERT INTO diets (name, sort_order) VALUES (?, ?)",
          name,
          nextOrder,
        );
      });
    });
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
        "UPDATE diets SET sort_order = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?",
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
  try {
    return await queueDatabaseOperation(async () => {
      const database = await requireDatabase();
      let dailyLogId: number | null = null;
      await database.withExclusiveTransactionAsync(async transaction => {
        const diet = await transaction.getFirstAsync<{ sync_id: string }>(
          "SELECT sync_id FROM diets WHERE id = ?",
          dietId,
        );
        if (!diet?.sync_id) throw new Error("Diet not found");

        await transaction.runAsync(
          `INSERT INTO daily_logs (sync_id, diet_id, date) VALUES (?, ?, ?)
           ON CONFLICT(diet_id, date) DO NOTHING`,
          getDailyLogSyncId(diet.sync_id, date),
          dietId,
          date,
        );
        const record = await transaction.getFirstAsync<{ id: number }>(
          "SELECT id FROM daily_logs WHERE diet_id = ? AND date = ?",
          dietId,
          date,
        );
        dailyLogId = record?.id ?? null;
      });
      if (dailyLogId === null) throw new Error("Daily log could not be created");
      return dailyLogId;
    });
  } catch (error) {
    console.error("Error adding daily log:", error);
    throw error;
  }
};

const queryAllStrict = async <T>(sql: string, ...params: any[]): Promise<T[]> =>
  await queueDatabaseOperation(async () => {
    const database = await requireDatabase();
    return await database.getAllAsync<T>(sql, ...params);
  });

const queryFirstStrict = async <T>(
  sql: string,
  ...params: any[]
): Promise<T | null> =>
  await queueDatabaseOperation(async () => {
    const database = await requireDatabase();
    return await database.getFirstAsync<T>(sql, ...params);
  });

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

export const getDailyLogsWithStats = async (dietId: number) => {
  return await queryAll<{
    id: number;
    sync_id: string;
    diet_id: number;
    date: string;
    created_at: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fats: number;
  }>(
    "Error getting daily logs with nutrition totals:",
    `SELECT dl.*,
            COALESCE(SUM(m.calories), 0) AS total_calories,
            COALESCE(SUM(m.protein), 0) AS total_protein,
            COALESCE(SUM(m.carbs), 0) AS total_carbs,
            COALESCE(SUM(m.fats), 0) AS total_fats
     FROM daily_logs dl
     LEFT JOIN meals m ON m.daily_log_id = dl.id
     WHERE dl.diet_id = ?
     GROUP BY dl.id
     ORDER BY dl.date DESC`,
    dietId,
  );
};

export const getAllDataForSync = async () => {
  return await queueDatabaseOperation(async () => {
    const database = await requireDatabase();
    const weights = await database.getAllAsync<any>("SELECT * FROM weights");
    const routines = await database.getAllAsync<any>("SELECT * FROM routines");
    const workouts = await database.getAllAsync<any>(`
      SELECT w.*, r.sync_id AS routine_sync_id
      FROM workouts w
      JOIN routines r ON r.id = w.routine_id
    `);
    const exercises = await database.getAllAsync<any>(`
      SELECT e.*, w.sync_id AS workout_sync_id
      FROM exercises e
      JOIN workouts w ON w.id = e.workout_id
    `);
    const exerciseLogs = await database.getAllAsync<any>(`
      SELECT el.*, e.sync_id AS exercise_sync_id
      FROM exercise_logs el
      JOIN exercises e ON e.id = el.exercise_id
    `);
    const diets = await database.getAllAsync<any>("SELECT * FROM diets");
    const dailyLogs = await database.getAllAsync<any>(`
      SELECT dl.*, d.sync_id AS diet_sync_id
      FROM daily_logs dl
      JOIN diets d ON d.id = dl.diet_id
    `);
    const meals = await database.getAllAsync<any>(`
      SELECT m.*, dl.sync_id AS daily_log_sync_id
      FROM meals m
      JOIN daily_logs dl ON dl.id = m.daily_log_id
    `);
    const cycles = await database.getAllAsync<any>("SELECT * FROM cycles");
    const cycleCompounds = await database.getAllAsync<any>(`
      SELECT cc.*, cy.sync_id AS cycle_sync_id, c.type, c.half_life_hours
      FROM cycle_compounds cc
      JOIN cycles cy ON cy.id = cc.cycle_id
      JOIN compounds c ON c.id = cc.compound_id
    `);

    return {
      weights,
      routines,
      workouts,
      exercises,
      exerciseLogs,
      diets,
      dailyLogs,
      meals,
      cycles,
      cycleCompounds,
    };
  });
};

// Sync metadata functions
export const getLastSyncTimestamp = async (
  collectionName: string,
): Promise<string | null> => {
  const result = await queryFirstStrict<{ last_sync_timestamp: string }>(
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

// APK metadata (local-only, not synced to Firestore)
export type DownloadedApkMetadata = {
  version_date: string;
  file_name: string | null;
  file_path: string | null;
};

export const getDownloadedApkMetadata = async (): Promise<DownloadedApkMetadata | null> =>
  await queryFirst<DownloadedApkMetadata>(
    "Error getting downloaded APK metadata:",
    `SELECT version_date, file_name, file_path
     FROM apks
     ORDER BY id DESC
     LIMIT 1`,
  );

export const setApkVersionDate = async (
  versionDate: string,
  fileName?: string,
  filePath?: string,
) => {
  const existing = await queryFirst<{ id: number }>(
    "Error checking existing APK record:",
    "SELECT id FROM apks ORDER BY id DESC LIMIT 1",
  );

  if (existing) {
    await execute(
      "Error updating APK version date:",
      "UPDATE apks SET version_date = ?, file_name = ?, file_path = ?, downloaded_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      versionDate,
      fileName ?? null,
      filePath ?? null,
      new Date().toISOString(),
      existing.id,
    );
  } else {
    await execute(
      "Error inserting APK version date:",
      "INSERT INTO apks (version_date, file_name, file_path, downloaded_at) VALUES (?, ?, ?, ?)",
      versionDate,
      fileName ?? null,
      filePath ?? null,
      new Date().toISOString(),
    );
  }
};

export const bulkInsertOrUpdate = async <T extends Record<string, any>>(
  tableName: string,
  records: T[],
  expectedOutboxEntries?: SyncOutboxEntry[],
) => {
  if (records.length === 0) {
    return { appliedSyncIds: [], skippedSyncIds: [] };
  }

  const collectionName = COLLECTION_BY_TABLE[tableName];
  if (!collectionName) throw new Error(`Unsupported sync table: ${tableName}`);
  const allowedColumns = new Set(LOCAL_COLUMNS_BY_COLLECTION[collectionName]);
  const relationship = SYNC_RELATIONSHIPS[collectionName];
  const expectedOutboxBySyncId = new Map(
    expectedOutboxEntries?.map(entry => [entry.sync_id, entry]),
  );
  const appliedSyncIds: string[] = [];
  const skippedSyncIds: string[] = [];

  await executeTransaction(
    `Error bulk inserting/updating ${tableName}:`,
    async (database) => {
      const parentIdsBySyncId = new Map<string, number>();
      if (relationship) {
        const parentTable = TABLE_BY_COLLECTION[relationship.parentCollection];
        const parents = await database.getAllAsync<{
          id: number;
          sync_id: string;
        }>(`SELECT id, sync_id FROM ${parentTable}`);
        parents.forEach(parent => parentIdsBySyncId.set(parent.sync_id, parent.id));
      }

      type LocalCompound = {
        half_life_hours: number;
        id: number;
        name: string;
        type: string;
      };
      const compoundsByName = new Map<string, LocalCompound[]>();
      if (tableName === "cycle_compounds") {
        const compounds = await database.getAllAsync<LocalCompound>(
          "SELECT id, name, type, half_life_hours FROM compounds",
        );
        for (const compound of compounds) {
          const matches = compoundsByName.get(compound.name) ?? [];
          matches.push(compound);
          compoundsByName.set(compound.name, matches);
        }
      }

      for (const record of records) {
        const normalizedRecord: Record<string, any> = { ...record };
        delete normalizedRecord.id;
        delete normalizedRecord.server_modified_at;

        if (typeof normalizedRecord.sync_id !== "string") {
          throw new Error(`Missing sync ID for ${collectionName}`);
        }

        if (expectedOutboxEntries) {
          const currentOutbox = await database.getFirstAsync<SyncOutboxEntry>(
            `SELECT collection_name, sync_id, operation, changed_at
             FROM sync_outbox
             WHERE collection_name = ? AND sync_id = ?`,
            collectionName,
            normalizedRecord.sync_id,
          );
          const expectedOutbox = expectedOutboxBySyncId.get(
            normalizedRecord.sync_id,
          );
          const outboxChanged = currentOutbox?.operation !== expectedOutbox?.operation
            || currentOutbox?.changed_at !== expectedOutbox?.changed_at;
          if (outboxChanged) {
            skippedSyncIds.push(normalizedRecord.sync_id);
            continue;
          }
        }

        if (relationship) {
          const parentSyncId = normalizedRecord[relationship.remoteKey];
          if (typeof parentSyncId !== "string") {
            throw new Error(
              `Missing ${relationship.remoteKey} for ${collectionName}`,
            );
          }
          const parentId = parentIdsBySyncId.get(parentSyncId);
          if (parentId === undefined) {
            throw new Error(
              `Missing parent ${relationship.parentCollection}/${parentSyncId}`,
            );
          }
          normalizedRecord[relationship.localKey] = parentId;
          delete normalizedRecord[relationship.remoteKey];
        }

        if (tableName === "cycle_compounds" && typeof record.name === "string") {
          const matchingCompounds = compoundsByName.get(record.name) ?? [];
          const isValidType = ["injectable", "oral", "peptide"].includes(record.type);
          const halfLifeHours = Number(record.half_life_hours);
          const hasValidMetadata = isValidType
            && Number.isFinite(halfLifeHours)
            && halfLifeHours > 0;
          let compound: LocalCompound | undefined = hasValidMetadata
            ? matchingCompounds.find((candidate) => (
                candidate.type === record.type
                && Math.abs(candidate.half_life_hours - halfLifeHours) < 1e-9
              ))
            : matchingCompounds.length === 1
              ? matchingCompounds[0]
              : undefined;

          if (!compound) {
            if (!hasValidMetadata) {
              throw new Error(`Unknown compound without valid metadata: ${record.name}`);
            }

            const result = await database.runAsync(
              "INSERT INTO compounds (name, type, half_life_hours) VALUES (?, ?, ?)",
              record.name,
              record.type,
              halfLifeHours,
            );
            compound = {
              id: Number(result.lastInsertRowId),
              name: record.name,
              type: record.type,
              half_life_hours: halfLifeHours,
            };
            compoundsByName.set(record.name, [...matchingCompounds, compound]);
          }

          normalizedRecord.compound_id = compound.id;
          delete normalizedRecord.type;
          delete normalizedRecord.half_life_hours;
        }

        const columns = Object.keys(normalizedRecord).filter(column =>
          allowedColumns.has(column),
        );
        const values = columns.map((column) => normalizedRecord[column]);
        const placeholders = columns.map(() => "?").join(", ");
        const updateColumns = columns.filter((column) => column !== "sync_id");
        const conflictClause = updateColumns.length > 0
          ? `DO UPDATE SET ${updateColumns.map((column) => `${column} = excluded.${column}`).join(", ")}`
          : "DO NOTHING";

        await database.runAsync(
          `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(sync_id) ${conflictClause}`,
          ...values,
        );
        await database.runAsync(
          `DELETE FROM sync_outbox
           WHERE collection_name = ? AND sync_id = ?`,
          collectionName,
          normalizedRecord.sync_id,
        );
        appliedSyncIds.push(normalizedRecord.sync_id);
      }
    },
  );
  return { appliedSyncIds, skippedSyncIds };
};

export const getSyncTombstones = async (): Promise<SyncTombstone[]> =>
  await queryAllStrict<SyncTombstone>(
    "SELECT collection_name, sync_id, deleted_at FROM sync_tombstones",
  );

export const upsertSyncTombstones = async (tombstones: SyncTombstone[]) => {
  if (tombstones.length === 0) return;
  await executeTransaction(
    "Error upserting sync tombstones:",
    async database => {
      for (const tombstone of tombstones) {
        await database.runAsync(
          `INSERT INTO sync_tombstones (collection_name, sync_id, deleted_at)
           VALUES (?, ?, ?)
           ON CONFLICT(collection_name, sync_id) DO UPDATE SET
             deleted_at = CASE
               WHEN excluded.deleted_at > sync_tombstones.deleted_at
               THEN excluded.deleted_at
               ELSE sync_tombstones.deleted_at
             END`,
          tombstone.collection_name,
          tombstone.sync_id,
          tombstone.deleted_at,
        );
      }
    },
  );
};

const DELETE_ORDER: readonly SyncCollectionName[] = [
  "exercise_logs",
  "exercises",
  "workouts",
  "meals",
  "daily_logs",
  "cycle_compounds",
  "routines",
  "diets",
  "cycles",
  "weights",
];

export const deleteRecordsBySyncIds = async (
  tombstones: SyncTombstone[],
) => {
  if (tombstones.length === 0) return;
  const syncIdsByCollection = new Map<SyncCollectionName, string[]>();
  for (const tombstone of tombstones) {
    const ids = syncIdsByCollection.get(tombstone.collection_name) ?? [];
    ids.push(tombstone.sync_id);
    syncIdsByCollection.set(tombstone.collection_name, ids);
  }

  await executeTransaction(
    "Error applying synced deletions:",
    async database => {
      for (const collectionName of DELETE_ORDER) {
        const syncIds = syncIdsByCollection.get(collectionName);
        if (!syncIds?.length) continue;
        const placeholders = syncIds.map(() => "?").join(", ");
        await database.runAsync(
          `DELETE FROM ${TABLE_BY_COLLECTION[collectionName]}
           WHERE sync_id IN (${placeholders})`,
          ...syncIds,
        );
      }
    },
  );
};

export const getSyncOutboxEntries = async (): Promise<SyncOutboxEntry[]> =>
  await queryAllStrict<SyncOutboxEntry>(
    `SELECT collection_name, sync_id, operation, changed_at
     FROM sync_outbox
     ORDER BY changed_at ASC`,
  );

export const clearSyncOutboxEntries = async (
  entries: (Pick<SyncOutboxEntry, "collection_name" | "sync_id">
    & Partial<Pick<SyncOutboxEntry, "operation" | "changed_at">>)[],
) => {
  if (entries.length === 0) return;
  await executeTransaction(
    "Error clearing sync outbox entries:",
    async database => {
      for (const entry of entries) {
        if (entry.operation && entry.changed_at) {
          await database.runAsync(
            `DELETE FROM sync_outbox
             WHERE collection_name = ? AND sync_id = ?
               AND operation = ? AND changed_at = ?`,
            entry.collection_name,
            entry.sync_id,
            entry.operation,
            entry.changed_at,
          );
        } else {
          await database.runAsync(
            `DELETE FROM sync_outbox
             WHERE collection_name = ? AND sync_id = ?`,
            entry.collection_name,
            entry.sync_id,
          );
        }
      }
    },
  );
};
