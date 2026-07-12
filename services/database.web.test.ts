import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  addCompound,
  addExercise,
  addExerciseLog,
  addRoutine,
  addWeight,
  addWorkout,
  bulkInsertOrUpdate,
  deleteRoutine,
  getAllDataForSync,
  getCompounds,
  getWeights,
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
      id: initial.weights[0].id,
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
    const compounds = await getCompounds();
    const localCompound = compounds.find(
      compound => compound.name === 'Testosterone Phenylpropionate',
    );

    await bulkInsertOrUpdate('cycle_compounds', [{
      id: 1,
      cycle_id: 1,
      compound_id: 4,
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
    await bulkInsertOrUpdate('cycle_compounds', [{
      id: 1,
      cycle_id: 1,
      compound_id: 999,
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
    await getCompounds();
    await addCompound('Testosterone Phenylpropionate', 'oral', 5);
    const compounds = await getCompounds();
    const customCompound = compounds.find(compound => (
      compound.name === 'Testosterone Phenylpropionate'
      && compound.type === 'oral'
    ));

    await bulkInsertOrUpdate('cycle_compounds', [{
      id: 1,
      cycle_id: 1,
      compound_id: 4,
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
});
