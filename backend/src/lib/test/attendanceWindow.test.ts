import { describe, expect, it } from 'vitest';
import { attendanceWindowHours } from '../attendanceWindow.js';

describe('attendanceWindowHours', () => {
  it('treats 09:00–18:00 as nine hours', () => {
    expect(attendanceWindowHours('09:00', '18:00')).toBe(9);
  });

  it('treats overnight 22:00–06:00 as eight hours', () => {
    expect(attendanceWindowHours('22:00', '06:00')).toBe(8);
  });

  it('treats equal clocks as zero hours', () => {
    expect(attendanceWindowHours('09:00', '09:00')).toBe(0);
    expect(attendanceWindowHours('15:52', '15:52')).toBe(0);
  });
});
