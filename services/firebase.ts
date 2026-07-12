import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import {
    FirebaseApp,
    FirebaseError,
    getApps,
    initializeApp,
} from "firebase/app";
import {
    Auth,
    getAuth,
  // @ts-expect-error Firebase exposes this in React Native bundles, but the exported type surface lags behind.
  getReactNativePersistence,
    initializeAuth,
} from "firebase/auth";
import {
    collection,
    doc,
    getDocs,
    getFirestore,
    writeBatch,
} from "firebase/firestore";
import { AppState, AppStateStatus, Platform } from "react-native";

import {
    bulkInsertOrUpdate,
    getAllDataForSync,
    initDatabase,
} from "@/services/database";
  import { sanitizeRecordForSync } from "@/services/sync-records";

const firebaseConfig = {
  apiKey: "AIzaSyDYCxW82L-nzn0hJP9vKbO8xf13LL1g0-0",
  authDomain: "trackmygains-c6056.firebaseapp.com",
  projectId: "trackmygains-c6056",
  storageBucket: "trackmygains-c6056.firebasestorage.app",
  messagingSenderId: "562933005382",
  appId: "1:562933005382:android:2def61d4e885dbecc09e47",
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
};

let authInstance: Auth | null = null;

export const getFirebaseAuth = () => {
  const app = getFirebaseApp();
  if (authInstance) {
    return authInstance;
  }
  if (Platform.OS === "web") {
    authInstance = getAuth(app);
    return authInstance;
  }
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
  return authInstance;
};

const SYNC_INTERVAL_MS = 60000;
const MAX_BATCH_SIZE = 400;
const NETWORK_CHECK_TIMEOUT_MS = 4000;

type SyncDoc = {
  collection: string;
  id: string;
  data: Record<string, any>;
};

type SyncResult =
  | "success"
  | "skipped"
  | "offline"
  | "unauthenticated"
  | "permission-denied"
  | "busy"
  | "failed";
type SyncOutcome = { status: SyncResult; counts?: Record<string, number> };

let syncInterval: ReturnType<typeof setInterval> | null = null;
let syncInProgress = false;
let lastSyncAt = 0;
let appStateSubscription: { remove: () => void } | null = null;
let permissionDeniedAt = 0;

const getCurrentUserId = () => {
  const auth = getFirebaseAuth();
  return auth.currentUser?.uid ?? null;
};

const isLikelyOnline = async () => {
  if (Platform.OS === "web") {
    if (typeof navigator !== "undefined" && "onLine" in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    NETWORK_CHECK_TIMEOUT_MS,
  );
  try {
    const response = await fetch("https://clients3.google.com/generate_204", {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

const mapDocs = <T extends { id: number }>(
  collectionName: string,
  records: T[],
): SyncDoc[] =>
  records.map((record) => ({
    collection: collectionName,
    id: String(record.id),
    data: sanitizeRecordForSync(collectionName, record),
  }));

const collectLocalData = async () => {
  await initDatabase();
  return await getAllDataForSync();
};

const commitBatches = async (
  docs: SyncDoc[],
  firestore: ReturnType<typeof getFirestore>,
  userId: string,
) => {
  console.log(
    `[Firestore Sync] Committing ${docs.length} documents in batches...`,
  );

  for (let index = 0; index < docs.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(firestore);
    const slice = docs.slice(index, index + MAX_BATCH_SIZE);
    for (const docItem of slice) {
      const ref = doc(
        firestore,
        "users",
        userId,
        docItem.collection,
        docItem.id,
      );
      batch.set(ref, docItem.data, { merge: true });
    }
    await batch.commit();
    console.log(
      `[Firestore Sync] Committed batch ${Math.floor(index / MAX_BATCH_SIZE) + 1} (${slice.length} docs)`,
    );
  }

  console.log(`[Firestore Sync] All batches committed successfully`);
};

const pruneCollection = async (
  firestore: ReturnType<typeof getFirestore>,
  userId: string,
  collectionName: string,
  localIds: Set<string>,
) => {
  const remoteSnapshot = await getDocs(
    collection(firestore, "users", userId, collectionName),
  );
  const deleteDocs: SyncDoc[] = [];

  remoteSnapshot.forEach((docSnap) => {
    if (!localIds.has(docSnap.id)) {
      deleteDocs.push({ collection: collectionName, id: docSnap.id, data: {} });
    }
  });

  if (deleteDocs.length > 0) {
    console.log(
      `[Firestore Sync] Pruning ${deleteDocs.length} documents from ${collectionName}`,
    );

    for (let index = 0; index < deleteDocs.length; index += MAX_BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const slice = deleteDocs.slice(index, index + MAX_BATCH_SIZE);
      for (const docItem of slice) {
        const ref = doc(
          firestore,
          "users",
          userId,
          docItem.collection,
          docItem.id,
        );
        batch.delete(ref);
      }
      await batch.commit();
    }
  }
};

const recordSyncError = (error: unknown) => {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    permissionDeniedAt = Date.now();
  }
};

export const syncLocalDataToFirestore = async (options?: {
  force?: boolean;
}): Promise<SyncOutcome> => {
  const force = options?.force ?? false;
  const userId = getCurrentUserId();

  console.log(
    `[Firestore Sync] Starting sync (force: ${force}, userId: ${userId ? "present" : "missing"})`,
  );

  if (!userId) {
    console.log("[Firestore Sync] Aborted: User not authenticated");
    return { status: "unauthenticated" };
  }
  if (syncInProgress) {
    console.log("[Firestore Sync] Aborted: Sync already in progress");
    return { status: "busy" };
  }
  if (!force && Date.now() - lastSyncAt < SYNC_INTERVAL_MS) {
    console.log("[Firestore Sync] Skipped: Too soon since last sync");
    return { status: "skipped" };
  }
  if (
    !force &&
    permissionDeniedAt &&
    Date.now() - permissionDeniedAt < SYNC_INTERVAL_MS
  ) {
    console.log("[Firestore Sync] Aborted: Permission denied recently");
    return { status: "permission-denied" };
  }

  const online = await isLikelyOnline();
  if (!online) {
    console.log("[Firestore Sync] Aborted: Device appears offline");
    return { status: "offline" };
  }

  syncInProgress = true;
  try {
    const localData = await collectLocalData();
    const firestore = getFirestore(getFirebaseApp());
    const counts = {
      weights: localData.weights.length,
      routines: localData.routines.length,
      workouts: localData.workouts.length,
      exercises: localData.exercises.length,
      exercise_logs: localData.exerciseLogs.length,
      diets: localData.diets.length,
      daily_logs: localData.dailyLogs.length,
      meals: localData.meals.length,
      cycles: localData.cycles.length,
      cycle_compounds: localData.cycleCompounds.length,
    };

    console.log("[Firestore Sync] Data collection summary:", counts);

    const docs: SyncDoc[] = [
      ...mapDocs("weights", localData.weights),
      ...mapDocs("routines", localData.routines),
      ...mapDocs("workouts", localData.workouts),
      ...mapDocs("exercises", localData.exercises),
      ...mapDocs("exercise_logs", localData.exerciseLogs),
      ...mapDocs("diets", localData.diets),
      ...mapDocs("daily_logs", localData.dailyLogs),
      ...mapDocs("meals", localData.meals),
      ...mapDocs("cycles", localData.cycles),
      ...mapDocs("cycle_compounds", localData.cycleCompounds),
    ];

    await commitBatches(docs, firestore, userId);

    console.log("[Firestore Sync] Starting pruning phase...");
    await pruneCollection(
      firestore,
      userId,
      "weights",
      new Set(localData.weights.map((item) => String(item.id))),
    );
    await pruneCollection(
      firestore,
      userId,
      "routines",
      new Set(localData.routines.map((item) => String(item.id))),
    );
    await pruneCollection(
      firestore,
      userId,
      "workouts",
      new Set(localData.workouts.map((item) => String(item.id))),
    );
    await pruneCollection(
      firestore,
      userId,
      "exercises",
      new Set(localData.exercises.map((item) => String(item.id))),
    );
    await pruneCollection(
      firestore,
      userId,
      "exercise_logs",
      new Set(localData.exerciseLogs.map((item) => String(item.id))),
    );
    await pruneCollection(
      firestore,
      userId,
      "diets",
      new Set(localData.diets.map((item) => String(item.id))),
    );
    await pruneCollection(
      firestore,
      userId,
      "daily_logs",
      new Set(localData.dailyLogs.map((item) => String(item.id))),
    );
    await pruneCollection(
      firestore,
      userId,
      "meals",
      new Set(localData.meals.map((item) => String(item.id))),
    );
    await pruneCollection(
      firestore,
      userId,
      "cycles",
      new Set(localData.cycles.map((item) => String(item.id))),
    );
    await pruneCollection(
      firestore,
      userId,
      "cycle_compounds",
      new Set(localData.cycleCompounds.map((item) => String(item.id))),
    );
    permissionDeniedAt = 0;
    lastSyncAt = Date.now();
    console.log("[Firestore Sync] ✅ Sync completed successfully");
    return { status: "success", counts };
  } catch (error) {
    console.error("[Firestore Sync] ❌ Sync failed with error:", error);
    recordSyncError(error);
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      console.log("[Firestore Sync] Error type: Permission denied");
      return { status: "permission-denied" };
    }
    return { status: "failed" };
  } finally {
    syncInProgress = false;
  }
};

export const startFirestoreAutoSync = () => {
  stopFirestoreAutoSync();

  const runSync = () => {
    void bidirectionalSync();
  };
  const startInterval = () => {
    if (!syncInterval) syncInterval = setInterval(runSync, SYNC_INTERVAL_MS);
  };
  const stopInterval = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  };

  if (AppState.currentState === "active") {
    startInterval();
    runSync();
  }

  appStateSubscription = AppState.addEventListener(
    "change",
    (state: AppStateStatus) => {
      if (state === "active") {
        startInterval();
        runSync();
      } else {
        stopInterval();
      }
    },
  );
};

export const stopFirestoreAutoSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};

// Bidirectional sync functions
type SyncStats = {
  pushed: Record<string, number>;
  pulled: Record<string, number>;
  conflicts: number;
};

const fetchFirestoreCollection = async <T extends Record<string, any>>(
  firestore: ReturnType<typeof getFirestore>,
  userId: string,
  collectionName: string,
): Promise<T[]> => {
  try {
    const snapshot = await getDocs(
      collection(firestore, "users", userId, collectionName),
    );
    return snapshot.docs.map((doc) => {
      const record = {
        id: doc.id,
        ...doc.data(),
      } as Record<string, unknown>;

      return sanitizeRecordForSync(collectionName, record) as T;
    });
  } catch (error) {
    console.error(`Error fetching ${collectionName} from Firestore:`, error);
    throw error;
  }
};

const compareAndSync = async <T extends { id: number; last_modified?: string }>(
  tableName: string,
  localRecords: T[],
  firestoreRecords: any[],
  firestore: ReturnType<typeof getFirestore>,
  userId: string,
): Promise<{ pushed: number; pulled: number }> => {
  let pushed = 0;
  let pulled = 0;

  // Create maps for easier lookup
  const localMap = new Map(localRecords.map((r) => [String(r.id), r]));
  const firestoreMap = new Map(firestoreRecords.map((r) => [String(r.id), r]));

  // Records to push (local is newer or doesn't exist in Firestore)
  const toPush: SyncDoc[] = [];
  // Records to pull (Firestore is newer or doesn't exist locally)
  const toPull: any[] = [];

  const normalizeTimestamp = (ts: string): number => {
    if (!ts) return 0;
    const timestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ts)
      ? new Date(ts.replace(" ", "T") + "Z").getTime()
      : new Date(ts).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  // Check all local records
  for (const localRecord of localRecords) {
    const firestoreRecord = firestoreMap.get(String(localRecord.id));

    if (!firestoreRecord) {
      // Doesn't exist in Firestore, push it
      toPush.push({
        collection: tableName,
        id: String(localRecord.id),
        data: sanitizeRecordForSync(tableName, localRecord),
      });
    } else {
      const localTime = normalizeTimestamp(localRecord.last_modified ?? "");
      const firestoreTime = normalizeTimestamp(firestoreRecord.last_modified ?? "");

      if (localTime > firestoreTime) {
        // Local is newer, push it
        toPush.push({
          collection: tableName,
          id: String(localRecord.id),
          data: sanitizeRecordForSync(tableName, localRecord),
        });
      } else if (firestoreTime > localTime) {
        // Firestore is newer, pull it
        toPull.push(firestoreRecord);
      }
      // If equal, skip
    }
  }

  // Check for records that exist only in Firestore
  for (const firestoreRecord of firestoreRecords) {
    if (!localMap.has(String(firestoreRecord.id))) {
      toPull.push(firestoreRecord);
    }
  }

  // Execute push operations
  if (toPush.length > 0) {
    await commitBatches(toPush, firestore, userId);
    pushed = toPush.length;
    console.log(
      `[Bidirectional Sync] Pushed ${pushed} records to ${tableName}`,
    );
  }

  // Execute pull operations
  if (toPull.length > 0) {
    await bulkInsertOrUpdate(tableName, toPull);
    pulled = toPull.length;
    console.log(
      `[Bidirectional Sync] Pulled ${pulled} records from ${tableName}`,
    );
  }

  return { pushed, pulled };
};

export const bidirectionalSync = async (options?: {
  force?: boolean;
}): Promise<SyncOutcome & { stats?: SyncStats }> => {
  const force = options?.force ?? false;
  const userId = getCurrentUserId();

  console.log(
    `[Bidirectional Sync] Starting sync (force: ${force}, userId: ${userId ? "present" : "missing"})`,
  );

  if (!userId) {
    console.log("[Bidirectional Sync] Aborted: User not authenticated");
    return { status: "unauthenticated" };
  }
  if (syncInProgress) {
    console.log("[Bidirectional Sync] Aborted: Sync already in progress");
    return { status: "busy" };
  }
  if (!force && Date.now() - lastSyncAt < SYNC_INTERVAL_MS) {
    console.log("[Bidirectional Sync] Skipped: Too soon since last sync");
    return { status: "skipped" };
  }
  if (
    !force &&
    permissionDeniedAt &&
    Date.now() - permissionDeniedAt < SYNC_INTERVAL_MS
  ) {
    console.log("[Bidirectional Sync] Aborted: Permission denied recently");
    return { status: "permission-denied" };
  }

  const online = await isLikelyOnline();
  if (!online) {
    console.log("[Bidirectional Sync] Aborted: Device appears offline");
    return { status: "offline" };
  }

  syncInProgress = true;
  try {
    await initDatabase();
    const firestore = getFirestore(getFirebaseApp());

    const stats: SyncStats = {
      pushed: {},
      pulled: {},
      conflicts: 0,
    };

    // Fetch all local data
    const localData = await collectLocalData();

    // Fetch all Firestore data
    console.log("[Bidirectional Sync] Fetching Firestore data...");
    const [
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
    ] = await Promise.all([
      fetchFirestoreCollection(firestore, userId, "weights"),
      fetchFirestoreCollection(firestore, userId, "routines"),
      fetchFirestoreCollection(firestore, userId, "workouts"),
      fetchFirestoreCollection(firestore, userId, "exercises"),
      fetchFirestoreCollection(
        firestore,
        userId,
        "exercise_logs",
      ),
      fetchFirestoreCollection(firestore, userId, "diets"),
      fetchFirestoreCollection(
        firestore,
        userId,
        "daily_logs",
      ),
      fetchFirestoreCollection(firestore, userId, "meals"),
      fetchFirestoreCollection(firestore, userId, "cycles"),
      fetchFirestoreCollection(
        firestore,
        userId,
        "cycle_compounds",
      ),
    ]);
    let resolvedCycleCompounds = cycleCompounds;
    if (cycleCompounds.some(record => !record.type || !record.half_life_hours)) {
      const legacyCompounds = await fetchFirestoreCollection(
        firestore,
        userId,
        "compounds",
      );
      const legacyCompoundsById = new Map(
        legacyCompounds.map(record => [String(record.id), record]),
      );
      resolvedCycleCompounds = cycleCompounds.map(record => {
        if (record.type && record.half_life_hours) return record;
        const compound = legacyCompoundsById.get(String(record.compound_id));
        return compound && compound.name === record.name
          ? {
              ...record,
              type: compound.type,
              half_life_hours: compound.half_life_hours,
            }
          : record;
      });
    }
    const firestoreData = {
      weights,
      routines,
      workouts,
      exercises,
      exerciseLogs,
      diets,
      dailyLogs,
      meals,
      cycles,
      cycleCompounds: resolvedCycleCompounds,
    };

    // Sync each collection
    const collections = [
      {
        name: "weights",
        local: localData.weights,
        firestore: firestoreData.weights,
      },
      {
        name: "routines",
        local: localData.routines,
        firestore: firestoreData.routines,
      },
      {
        name: "workouts",
        local: localData.workouts,
        firestore: firestoreData.workouts,
      },
      {
        name: "exercises",
        local: localData.exercises,
        firestore: firestoreData.exercises,
      },
      {
        name: "exercise_logs",
        local: localData.exerciseLogs,
        firestore: firestoreData.exerciseLogs,
      },
      { name: "diets", local: localData.diets, firestore: firestoreData.diets },
      {
        name: "daily_logs",
        local: localData.dailyLogs,
        firestore: firestoreData.dailyLogs,
      },
      { name: "meals", local: localData.meals, firestore: firestoreData.meals },
      {
        name: "cycles",
        local: localData.cycles,
        firestore: firestoreData.cycles,
      },
      {
        name: "cycle_compounds",
        local: localData.cycleCompounds,
        firestore: firestoreData.cycleCompounds,
      },
    ];

    for (const { name, local, firestore: firestoreRecords } of collections) {
      const result = await compareAndSync(
        name,
        local as any[],
        firestoreRecords,
        firestore,
        userId,
      );
      stats.pushed[name] = result.pushed;
      stats.pulled[name] = result.pulled;
    }

    permissionDeniedAt = 0;
    lastSyncAt = Date.now();

    const totalPushed = Object.values(stats.pushed).reduce((a, b) => a + b, 0);
    const totalPulled = Object.values(stats.pulled).reduce((a, b) => a + b, 0);

    console.log(`[Bidirectional Sync] ✅ Sync completed successfully`);
    console.log(
      `[Bidirectional Sync] Pushed: ${totalPushed}, Pulled: ${totalPulled}`,
    );

    return { status: "success", stats };
  } catch (error) {
    console.error("[Bidirectional Sync] ❌ Sync failed with error:", error);
    recordSyncError(error);
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      console.log("[Bidirectional Sync] Error type: Permission denied");
      return { status: "permission-denied" };
    }
    return { status: "failed" };
  } finally {
    syncInProgress = false;
  }
};
