import { AppError } from '../types/errors.js';

export const PROJECT_OUTSIDE_WINDOW = 'התאריך מחוץ לטווח הפרויקט';

export interface ProjectDateWindow {
  startDate: Date | null;
  endDate: Date | null;
}

function toIsoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Older projects with no window stay reportable on any date. */
export function isIsoDayInProjectWindow(isoDay: string, window: ProjectDateWindow): boolean {
  if (!window.startDate || !window.endDate) return true;
  const start = toIsoDay(window.startDate);
  const end = toIsoDay(window.endDate);
  return isoDay >= start && isoDay <= end;
}

export function assertIsoDayInProjectWindow(
  isoDay: string,
  window: ProjectDateWindow,
  field = 'date',
): void {
  if (isIsoDayInProjectWindow(isoDay, window)) return;
  throw AppError.badRequest(PROJECT_OUTSIDE_WINDOW, [{ field, message: PROJECT_OUTSIDE_WINDOW }]);
}
