import { describe, expect, it } from '@jest/globals';

import { formatLocalDateKey, parseLocalDateKey } from './date-utils';

describe('local calendar date helpers', () => {
  it('formats local calendar components without converting through UTC', () => {
    const localDate = new Date(2026, 6, 31, 0, 15);
    expect(formatLocalDateKey(localDate)).toBe('2026-07-31');
  });

  it('parses a date-only key in local time', () => {
    const parsed = parseLocalDateKey('2026-07-31');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(31);
  });
});
