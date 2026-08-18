import { describe, expect, it } from 'vitest';
import {
  attendanceWindowHours,
  derivedHoursFromMinutes,
  intervalsOverlap,
  minutesIntoWindow,
  rowIntervalOnDayAxis,
} from '../attendanceWindow.js';

describe('attendanceWindowHours', () => {
  it('treats 09:00–18:00 as nine hours', () => {
    expect(attendanceWindowHours('09:00', '18:00')).toBe(9);
  });

  it('treats overnight 22:00–06:00 as eight hours', () => {
    expect(attendanceWindowHours('22:00', '06:00')).toBe(8);
  });

  it('treats equal clocks as a twenty-four hour window', () => {
    expect(attendanceWindowHours('09:00', '09:00')).toBe(24);
  });
});

describe('minutesIntoWindow', () => {
  it('measures from the day start, not from midnight', () => {
    expect(minutesIntoWindow('09:00', '10:00')).toBe(60);
  });

  it('places the day start itself at zero', () => {
    expect(minutesIntoWindow('09:00', '09:00')).toBe(0);
  });

  it('carries a clock past midnight forward on an overnight day', () => {
    expect(minutesIntoWindow('22:00', '02:00')).toBe(240);
  });

  it('places a clock before the day start on the next morning', () => {
    expect(minutesIntoWindow('22:00', '06:00')).toBe(480);
  });
});

describe('rowIntervalOnDayAxis', () => {
  it('maps a same-day row onto the axis', () => {
    expect(rowIntervalOnDayAxis('09:00', '10:00', '13:00')).toEqual({ start: 60, end: 240 });
  });

  it('maps a row inside an overnight day', () => {
    expect(rowIntervalOnDayAxis('22:00', '23:00', '02:00')).toEqual({ start: 60, end: 240 });
  });

  it('reads a row ending at the day start clock as end-of-day, not zero-length', () => {
    expect(rowIntervalOnDayAxis('09:00', '09:00', '09:00')).toEqual({ start: 0, end: 1440 });
  });
});

describe('intervalsOverlap', () => {
  it('reports a shared stretch as overlapping', () => {
    expect(intervalsOverlap({ start: 0, end: 240 }, { start: 180, end: 480 })).toBe(true);
  });

  it('does not treat touching endpoints as overlapping', () => {
    expect(intervalsOverlap({ start: 0, end: 240 }, { start: 240, end: 480 })).toBe(false);
  });

  it('reports full containment as overlapping', () => {
    expect(intervalsOverlap({ start: 0, end: 480 }, { start: 60, end: 180 })).toBe(true);
  });

  it('does not treat disjoint intervals as overlapping', () => {
    expect(intervalsOverlap({ start: 0, end: 60 }, { start: 120, end: 180 })).toBe(false);
  });
});

describe('derivedHoursFromMinutes', () => {
  it('derives a whole number of hours', () => {
    expect(derivedHoursFromMinutes(240)).toBe(4);
  });

  it('rounds a twenty-minute stint to one decimal place', () => {
    expect(derivedHoursFromMinutes(20)).toBe(0.3);
  });

  it('rounds half up', () => {
    expect(derivedHoursFromMinutes(3)).toBe(0.1);
  });
});
