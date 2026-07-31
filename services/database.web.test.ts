import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  addCompound,
  addCycle,
  addDailyLog,
  addDiet,
  addExercise,
  addExerciseLog,
  addMeal,
  addRoutine,
  addWeight,
  addWorkout,
  bulkInsertOrUpdate,
  clearSyncOutboxEntries,
  deleteRoutine,
  deleteWeight,
  getAllDataForSync,
  getCompounds,
  getDailyLogsWithStats,
  getDailyLogs,
  getMeals,
  getSyncOutboxEntries,
  getSyncTombstones,
  getWeights,
  initDatabase,
} from './database.web';

class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe('database.web', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: new LocalStorageMock(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('test_addWeight_sameMillisecond_generatesUniqueIds', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1760000000000);

    await addWeight(90, '2026-05-12T10:00:00.000Z');
    await addWeight(91, '2026-05-12T11:00:00.000Z');

    const weights = await getWeights();
    expect(new Set(weights.map(weight => weight.id)).size).toBe(2);
  });

  it('timestamps new records and bulk upserts remote changes', async () => {
    await addWeight(90, '2026-05-12T10:00:00.000Z');
    const initial = await getAllDataForSync();

    expect(initial.weights[0].last_modified).toEqual(expect.any(String));

    await bulkInsertOrUpdate('weights', [{
      sync_id: initial.weights[0].sync_id,
      weight: 91,
      date: '2026-05-13T10:00:00.000Z',
      last_modified: '2026-05-13T10:00:00.000Z',
    }]);

    const updated = await getAllDataForSync();
    expect(updated.weights).toHaveLength(1);
    expect(updated.weights[0]).toMatchObject({
      weight: 91,
      last_modified: '2026-05-13T10:00:00.000Z',
    });
  });

  it('deleting a routine removes descendant exercise logs', async () => {
    await addRoutine('Routine');
    let data = await getAllDataForSync();
    const routineId = data.routines[0].id;

    await addWorkout(routineId, 'Workout');
    data = await getAllDataForSync();
    const workoutId = data.workouts[0].id;

    await addExercise(workoutId, 'Exercise');
    data = await getAllDataForSync();
    const exerciseId = data.exercises[0].id;
    await addExerciseLog(exerciseId, '2026-05-12', 100, 'kg', 5, 3);

    await deleteRoutine(routineId);

    data = await getAllDataForSync();
    expect(data.routines).toHaveLength(0);
    expect(data.workouts).toHaveLength(0);
    expect(data.exercises).toHaveLength(0);
    expect(data.exerciseLogs).toHaveLength(0);
  });

  it('maps pulled cycle compounds to the local compound ID by name', async () => {
    await addCycle('Cycle', '2026-05-01', '2026-06-01');
    const cycle = (await getAllDataForSync()).cycles[0];
    const compounds = await getCompounds();
    const localCompound = compounds.find(
      compound => compound.name === 'Testosterone Phenylpropionate',
    );

    await bulkInsertOrUpdate('cycle_compounds', [{
      sync_id: 'uuid:remote-cycle-compound',
      cycle_sync_id: cycle.sync_id,
      name: 'Testosterone Phenylpropionate',
      amount: 100,
      amount_unit: 'mg',
      dosing_period: 7,
      start_date: '2026-05-01',
      end_date: '2026-06-01',
      created_at: '2026-05-01T00:00:00.000Z',
      last_modified: '2026-05-01T00:00:00.000Z',
    }]);

    const data = await getAllDataForSync();
    expect(localCompound?.id).toBe(24);
    expect(data.cycleCompounds[0].compound_id).toBe(localCompound?.id);
  });

  it('creates a missing custom compound from pulled metadata', async () => {
    await addCycle('Cycle', '2026-05-01', '2026-06-01');
    const cycle = (await getAllDataForSync()).cycles[0];
    await bulkInsertOrUpdate('cycle_compounds', [{
      sync_id: 'uuid:custom-cycle-compound',
      cycle_sync_id: cycle.sync_id,
      name: 'Custom Compound',
      type: 'peptide',
      half_life_hours: 12,
      amount: 100,
      amount_unit: 'mcg',
      dosing_period: 1,
      start_date: '2026-05-01',
      end_date: '2026-06-01',
      created_at: '2026-05-01T00:00:00.000Z',
      last_modified: '2026-05-01T00:00:00.000Z',
    }]);

    const compounds = await getCompounds();
    const customCompound = compounds.find(compound => compound.name === 'Custom Compound');
    const data = await getAllDataForSync();

    expect(customCompound).toMatchObject({ type: 'peptide', half_life_hours: 12 });
    expect(data.cycleCompounds[0].compound_id).toBe(customCompound?.id);
  });

  it('uses metadata to disambiguate duplicate compound names', async () => {
    await addCycle('Cycle', '2026-05-01', '2026-06-01');
    const cycle = (await getAllDataForSync()).cycles[0];
    await getCompounds();
    await addCompound('Testosterone Phenylpropionate', 'oral', 5);
    const compounds = await getCompounds();
    const customCompound = compounds.find(compound => (
      compound.name === 'Testosterone Phenylpropionate'
      && compound.type === 'oral'
    ));

    await bulkInsertOrUpdate('cycle_compounds', [{
      sync_id: 'uuid:duplicate-name-cycle-compound',
      cycle_sync_id: cycle.sync_id,
      name: 'Testosterone Phenylpropionate',
      type: 'oral',
      half_life_hours: 5,
      amount: 10,
      amount_unit: 'mg',
      dosing_period: 1,
      start_date: '2026-05-01',
      end_date: '2026-06-01',
      created_at: '2026-05-01T00:00:00.000Z',
      last_modified: '2026-05-01T00:00:00.000Z',
    }]);

    const data = await getAllDataForSync();
    expect(data.cycleCompounds[0].compound_id).toBe(customCompound?.id);
  });

  it('queues stable-ID tombstones when a record is deleted', async () => {
    await addWeight(90, '2026-05-12T10:00:00.000Z');
    const weight = (await getAllDataForSync()).weights[0];
    const pendingUpsert = (await getSyncOutboxEntries()).find(entry =>
      entry.collection_name === 'weights' && entry.sync_id === weight.sync_id,
    );
    expect(pendingUpsert).toBeDefined();

    await deleteWeight(weight.id);
    await clearSyncOutboxEntries([pendingUpsert!]);

    expect(await getSyncTombstones()).toContainEqual(expect.objectContaining({
      collection_name: 'weights',
      sync_id: weight.sync_id,
    }));
    expect(await getSyncOutboxEntries()).toContainEqual(expect.objectContaining({
      collection_name: 'weights',
      sync_id: weight.sync_id,
      operation: 'delete',
    }));
  });

  it('does not overwrite a newer local deletion with an in-flight pull', async () => {
    await addWeight(90, '2026-05-12T10:00:00.000Z');
    const weight = (await getAllDataForSync()).weights[0];
    const pendingUpsert = (await getSyncOutboxEntries()).find(entry =>
      entry.collection_name === 'weights' && entry.sync_id === weight.sync_id,
    );
    expect(pendingUpsert).toBeDefined();
    await deleteWeight(weight.id);

    const result = await bulkInsertOrUpdate('weights', [{
      sync_id: weight.sync_id,
      weight: 91,
      date: '2026-05-13T10:00:00.000Z',
      last_modified: '2026-05-13T10:00:00.000Z',
    }], [pendingUpsert!]);

    expect(result.skippedSyncIds).toEqual([weight.sync_id]);
    expect(await getWeights()).toEqual([]);
    expect(await getSyncOutboxEntries()).toContainEqual(expect.objectContaining({
      sync_id: weight.sync_id,
      operation: 'delete',
    }));
  });

  it('reuses one daily log per local date and aggregates its meals', async () => {
    await addDiet('Diet');
    const diet = (await getAllDataForSync()).diets[0];
    const firstId = await addDailyLog(diet.id, '2026-07-31');
    const secondId = await addDailyLog(diet.id, '2026-07-31');
    await addMeal(firstId, 'Breakfast', 500, 40, 50, 15);
    await addMeal(firstId, 'Lunch', 700, 60, 70, 20);

    const logs = await getDailyLogsWithStats(diet.id);
    expect(secondId).toBe(firstId);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      total_calories: 1200,
      total_protein: 100,
      total_carbs: 120,
      total_fats: 35,
    });
  });

  it('migrates duplicate stored diet days and preserves their meals', async () => {
    localStorage.setItem('trackmygains_daily_logs', JSON.stringify([
      {
        id: 1,
        sync_id: 'uuid:day-b',
        diet_id: 7,
        date: '2026-07-31',
      },
      {
        id: 2,
        sync_id: 'uuid:day-a',
        diet_id: 7,
        date: '2026-07-31',
      },
    ]));
    localStorage.setItem('trackmygains_meals', JSON.stringify([{
      id: 3,
      sync_id: 'uuid:meal',
      daily_log_id: 1,
      name: 'Breakfast',
      calories: 500,
      protein: 40,
      carbs: 50,
      fats: 15,
    }]));

    await initDatabase();

    const logs = await getDailyLogs(7);
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe(2);
    expect(await getMeals(2)).toHaveLength(1);
    expect(await getSyncTombstones()).toContainEqual(expect.objectContaining({
      collection_name: 'daily_logs',
      sync_id: 'uuid:day-b',
    }));
  });
});
