import { describe, expect, it } from 'vitest';
import { expandWorkingDays } from '../workingDays.service.js';

// Formats from local date parts, not toISOString() - that normalizes to
// UTC and would shift the date in timezones ahead of UTC (e.g. Israel),
// where local midnight is still the previous day in UTC.
function isoDates(dates: Date[]): string[] {
  return dates.map((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
}

describe('expandWorkingDays', () => {
  it('excludes Friday and Saturday from a range spanning a full week', () => {
    // Sun 2026-01-04 .. Sat 2026-01-10
    const result = expandWorkingDays(new Date(2026, 0, 4), new Date(2026, 0, 10));

    expect(isoDates(result.workingDays)).toEqual([
      '2026-01-04',
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
    ]);
  });

  it('returns zero working days for a range consisting only of Friday and Saturday', () => {
    // Fri 2026-01-09 .. Sat 2026-01-10
    const result = expandWorkingDays(new Date(2026, 0, 9), new Date(2026, 0, 10));

    expect(result.workingDays).toEqual([]);
  });

  it('returns the single date for a single-day range on a working day', () => {
    // Sun 2026-01-04
    const result = expandWorkingDays(new Date(2026, 0, 4), new Date(2026, 0, 4));

    expect(isoDates(result.workingDays)).toEqual(['2026-01-04']);
  });

  it('returns zero working days for a single-day range on a weekend day', () => {
    // Sat 2026-01-10
    const result = expandWorkingDays(new Date(2026, 0, 10), new Date(2026, 0, 10));

    expect(result.workingDays).toEqual([]);
  });

  it('rejects an inverted range where end precedes start', () => {
    expect(() => expandWorkingDays(new Date(2026, 0, 10), new Date(2026, 0, 4))).toThrow(
      /end date/i,
    );
  });

  it('computes correctly across a month boundary', () => {
    // Wed 2026-01-28 .. Tue 2026-02-03
    const result = expandWorkingDays(new Date(2026, 0, 28), new Date(2026, 1, 3));

    expect(isoDates(result.workingDays)).toEqual([
      '2026-01-28',
      '2026-01-29',
      '2026-02-01',
      '2026-02-02',
      '2026-02-03',
    ]);
  });

  it('computes correctly across a year boundary', () => {
    // Mon 2025-12-29 .. Fri 2026-01-02
    const result = expandWorkingDays(new Date(2025, 11, 29), new Date(2026, 0, 2));

    expect(isoDates(result.workingDays)).toEqual([
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
    ]);
  });

  it('returns a count equal to the length of the working-day list', () => {
    const result = expandWorkingDays(new Date(2026, 0, 4), new Date(2026, 0, 10));

    expect(result.count).toBe(result.workingDays.length);
    expect(result.count).toBe(5);
  });
});
