/** `HH:mm` → minutes from midnight. */
export function minutesFromHhmm(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Attendance window in hours. If end is later than start, same calendar day.
 * If end is earlier than or equal to start, end is the next day (equal → 24h).
 */
export function attendanceWindowHours(startTime: string, endTime: string): number {
  return attendanceWindowMinutes(startTime, endTime) / 60;
}

export function attendanceWindowMinutes(startTime: string, endTime: string): number {
  const start = minutesFromHhmm(startTime);
  const end = minutesFromHhmm(endTime);
  if (end > start) return end - start;
  return 24 * 60 - start + end;
}

export function isOneDecimalHours(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
}

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function allocationsFitWindow(startTime: string, endTime: string, allocations: number[]): boolean {
  const allocatedMinutes = allocations.reduce((sum, hours) => sum + hoursToMinutes(hours), 0);
  return allocatedMinutes <= attendanceWindowMinutes(startTime, endTime);
}
