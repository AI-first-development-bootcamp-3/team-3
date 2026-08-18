import { describe, expect, it } from 'vitest';
import { isIsoDayInProjectWindow } from '../projectWindow.service.js';

describe('isIsoDayInProjectWindow', () => {
  it('allows any day when the project has no window', () => {
    expect(isIsoDayInProjectWindow('2026-08-16', { startDate: null, endDate: null })).toBe(true);
  });

  it('includes both ends of the range', () => {
    const window = {
      startDate: new Date('2025-09-20T00:00:00.000Z'),
      endDate: new Date('2026-02-20T00:00:00.000Z'),
    };
    expect(isIsoDayInProjectWindow('2025-09-20', window)).toBe(true);
    expect(isIsoDayInProjectWindow('2026-02-20', window)).toBe(true);
    expect(isIsoDayInProjectWindow('2025-09-19', window)).toBe(false);
    expect(isIsoDayInProjectWindow('2026-02-21', window)).toBe(false);
  });
});
