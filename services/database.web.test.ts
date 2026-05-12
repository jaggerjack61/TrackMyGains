import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { addWeight, getWeights } from './database.web';

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
});