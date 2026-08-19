/** Daily standard and the half-vacation remainder (SCRUM-236). */
export const STANDARD_DAY_HOURS = 9
export const HALF_DAY_HOURS = 4.5

/**
 * Hours the employee still has to allocate to complete the day. Distinct from
 * the attendance-window length (09:00–18:00 is always 9): a half-day vacation
 * lowers that target to HALF_DAY_HOURS, but extra hours inside the window are
 * allowed.
 */
export function workHoursTarget(windowHours: number, halfDayVacation: boolean): number {
  const base = windowHours > 0 ? windowHours : STANDARD_DAY_HOURS
  return halfDayVacation ? Math.min(base, HALF_DAY_HOURS) : base
}

export function isHalfDayVacation(absence: { type: string; halfDay: boolean } | undefined): boolean {
  return Boolean(absence && absence.type === 'VACATION' && absence.halfDay)
}
