/** Daily standard and the half-vacation remainder (SCRUM-236). */
export const STANDARD_DAY_HOURS = 9
export const HALF_DAY_HOURS = 4.5

export function workHoursTarget(windowHours: number, halfDayVacation: boolean): number {
  const base = windowHours > 0 ? windowHours : STANDARD_DAY_HOURS
  return halfDayVacation ? Math.min(base, HALF_DAY_HOURS) : base
}

export function isHalfDayVacation(absence: { type: string; halfDay: boolean } | undefined): boolean {
  return Boolean(absence && absence.type === 'VACATION' && absence.halfDay)
}
