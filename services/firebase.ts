import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, FirebaseError, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore';
import { AppState, AppStateStatus, Platform } from 'react-native';

import {
    getCompounds,
    getCycleCompounds,
    getCycles,
    getDailyLogs,
    getDiets,
    getExerciseLogs,
    getExercises,
    getMeals,
    getRoutines,
    getWeights,
    getWorkouts,
    initDatabase,
} from '@/services/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDYCxW82L-nzn0hJP9vKbO8xf13LL1g0-0',
  authDomain: 'trackmygains-c6056.firebaseapp.com',
  projectId: 'trackmygains-c6056',
  storageBucket: 'trackmygains-c6056.firebasestorage.app',
  messagingSenderId: '562933005382',
  appId: '1:562933005382:android:2def61d4e885dbecc09e47',
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
  if (Platform.OS === 'web') {
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

type SyncResult = 'success' | 'skipped' | 'offline' | 'unauthenticated' | 'permission-denied' | 'busy' | 'failed';
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
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NETWORK_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

const mapDocs = <T extends { id: number }>(collectionName: string, records: T[]): SyncDoc[] =>
  records.map(record => ({
    collection: collectionName,
    id: String(record.id),
    data: record,
  }));

const collectLocalData = async () => {
  await initDatabase();

  const weights = await getWeights();
  const routines = await getRoutines();
  const workouts = (await Promise.all(routines.map(routine => getWorkouts(routine.id)))).flat();
  const exercises = (await Promise.all(workouts.map(workout => getExercises(workout.id)))).flat();
  const exerciseLogs = (await Promise.all(exercises.map(exercise => getExerciseLogs(exercise.id)))).flat();
  const diets = await getDiets();
  const dailyLogs = (await Promise.all(diets.map(diet => getDailyLogs(diet.id)))).flat();
  const meals = (await Promise.all(dailyLogs.map(log => getMeals(log.id)))).flat();
  const cycles = await getCycles();
  const cycleCompounds = (await Promise.all(cycles.map(cycle => getCycleCompounds(cycle.id)))).flat();
  const compounds = await getCompounds();

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
    compounds,
  };
};

const commitBatches = async (docs: SyncDoc[], firestore: ReturnType<typeof getFirestore>, userId: string) => {
  for (let index = 0; index < docs.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(firestore);
    const slice = docs.slice(index, index + MAX_BATCH_SIZE);
    for (const docItem of slice) {
      const ref = doc(firestore, 'users', userId, docItem.collection, docItem.id);
      batch.set(ref, docItem.data, { merge: true });
    }
    await batch.commit();
  }
};

const pruneCollection = async (
  firestore: ReturnType<typeof getFirestore>,
  userId: string,
  collectionName: string,
  localIds: Set<string>
) => {
  const remoteSnapshot = await getDocs(collection(firestore, 'users', userId, collectionName));
  const deleteDocs: SyncDoc[] = [];

  remoteSnapshot.forEach(docSnap => {
    if (!localIds.has(docSnap.id)) {
      deleteDocs.push({ collection: collectionName, id: docSnap.id, data: {} });
    }
  });

  for (let index = 0; index < deleteDocs.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(firestore);
    const slice = deleteDocs.slice(index, index + MAX_BATCH_SIZE);
    for (const docItem of slice) {
      const ref = doc(firestore, 'users', userId, docItem.collection, docItem.id);
      batch.delete(ref);
    }
    await batch.commit();
  }
};

const recordSyncError = (error: unknown) => {
  if (error instanceof FirebaseError && error.code === 'permission-denied') {
    permissionDeniedAt = Date.now();
  }
};

export const syncLocalDataToFirestore = async (options?: { force?: boolean }): Promise<SyncOutcome> => {
  const force = options?.force ?? false;
  const userId = getCurrentUserId();
  if (!userId) return { status: 'unauthenticated' };
  if (syncInProgress) return { status: 'busy' };
  if (!force && Date.now() - lastSyncAt < SYNC_INTERVAL_MS) return { status: 'skipped' };
  if (!force && permissionDeniedAt && Date.now() - permissionDeniedAt < SYNC_INTERVAL_MS) {
    return { status: 'permission-denied' };
  }

  const online = await isLikelyOnline();
  if (!online) return { status: 'offline' };

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
      compounds: localData.compounds.length,
    };

    const docs: SyncDoc[] = [
      ...mapDocs('weights', localData.weights),
      ...mapDocs('routines', localData.routines),
      ...mapDocs('workouts', localData.workouts),
      ...mapDocs('exercises', localData.exercises),
      ...mapDocs('exercise_logs', localData.exerciseLogs),
      ...mapDocs('diets', localData.diets),
      ...mapDocs('daily_logs', localData.dailyLogs),
      ...mapDocs('meals', localData.meals),
      ...mapDocs('cycles', localData.cycles),
      ...mapDocs('cycle_compounds', localData.cycleCompounds),
      ...mapDocs('compounds', localData.compounds),
    ];

    await commitBatches(docs, firestore, userId);

    await pruneCollection(firestore, userId, 'weights', new Set(localData.weights.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'routines', new Set(localData.routines.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'workouts', new Set(localData.workouts.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'exercises', new Set(localData.exercises.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'exercise_logs', new Set(localData.exerciseLogs.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'diets', new Set(localData.diets.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'daily_logs', new Set(localData.dailyLogs.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'meals', new Set(localData.meals.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'cycles', new Set(localData.cycles.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'cycle_compounds', new Set(localData.cycleCompounds.map(item => String(item.id))));
    await pruneCollection(firestore, userId, 'compounds', new Set(localData.compounds.map(item => String(item.id))));

    permissionDeniedAt = 0;
    lastSyncAt = Date.now();
    return { status: 'success', counts };
  } catch (error) {
    recordSyncError(error);
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      return { status: 'permission-denied' };
    }
    return { status: 'failed' };
  } finally {
    syncInProgress = false;
  }
};

export const startFirestoreAutoSync = () => {
  stopFirestoreAutoSync();

  const runSync = () => {
    void syncLocalDataToFirestore();
  };

  syncInterval = setInterval(runSync, SYNC_INTERVAL_MS);
  runSync();

  appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      runSync();
    }
  });
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
