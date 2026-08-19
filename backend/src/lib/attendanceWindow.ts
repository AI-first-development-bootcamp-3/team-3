/** `HH:mm` → minutes from midnight. Converted after splitting rather than with
 * `.map(Number)` so a short string yields NaN instead of a silent 0. */
export function minutesFromHhmm(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/**
 * Attendance window in hours. If end is later than start, same calendar day.
 * If end equals start, zero hours. If end is earlier than start, end is the next day.
 */
export function attendanceWindowHours(startTime: string, endTime: string): number {
  return attendanceWindowMinutes(startTime, endTime) / 60;
}

export function attendanceWindowMinutes(startTime: string, endTime: string): number {
  const start = minutesFromHhmm(startTime);
  const end = minutesFromHhmm(endTime);
  if (end === start) return 0;
  if (end > start) return end - start;
  return 24 * 60 - start + end;
}

/**
 * Position of a clock on the day's own axis: minutes elapsed since the day
 * started. On an overnight day (22:00–06:00) a clock at or before the day
 * start belongs to the next morning, so 02:00 is 240, not -1200. Every
 * containment and overlap check runs on this axis so nothing has to special-
 * case "after midnight".
 */
export function minutesIntoWindow(dayStart: string, clock: string): number {
  const start = minutesFromHhmm(dayStart);
  const at = minutesFromHhmm(clock);
  return at >= start ? at - start : 24 * 60 - start + at;
}

/**
 * Half-open overlap: two intervals clash only when they share a minute.
 * 09:00–13:00 followed by 13:00–17:00 is the ordinary way to describe
 * switching projects at 13:00, so touching endpoints are not a clash.
 */
export function intervalsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}

export interface RowInterval {
  start: number;
  end: number;
}

/**
 * A row's own clock pair placed on the day axis. A row ending exactly at the
 * day's start clock ran to the end of the day rather than for zero minutes —
 * only reachable on a 24-hour window, where it is the only sensible reading.
 * On a shorter window the same input lands outside the window and is rejected
 * by the containment check, which is also correct.
 */
export function rowIntervalOnDayAxis(
  dayStart: string,
  rowStart: string,
  rowEnd: string,
): RowInterval {
  const start = minutesIntoWindow(dayStart, rowStart);
  const end = minutesIntoWindow(dayStart, rowEnd);
  return { start, end: end === 0 ? 24 * 60 : end };
}

/**
 * Hours for a derived (clock-in/out) row. `hours` is Decimal(4,1), so a
 * 20-minute stint necessarily stores as 0.3; rounding here rather than at the
 * database keeps the value the service validates identical to the one it
 * persists.
 */
export function derivedHoursFromMinutes(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

export function isOneDecimalHours(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
}

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function allocationsFitWindow(
  startTime: string,
  endTime: string,
  allocations: number[],
  maxHours?: number,
): boolean {
  const allocatedMinutes = allocations.reduce((sum, hours) => sum + hoursToMinutes(hours), 0);
  const windowMinutes = attendanceWindowMinutes(startTime, endTime);
  const capMinutes = maxHours !== undefined ? Math.min(windowMinutes, hoursToMinutes(maxHours)) : windowMinutes;
  return allocatedMinutes <= capMinutes;
}
