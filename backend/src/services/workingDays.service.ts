import { AppError } from '../types/errors.js';

export interface ExpandWorkingDaysOptions {
  /**
   * Reserved for a future holiday calendar (ISO `YYYY-MM-DD` dates to treat
   * as non-working, in addition to Friday/Saturday). Not applied yet -
   * SCRUM-144 explicitly defers Israeli holiday support to a later change.
   */
  holidayCalendar?: Set<string>;
}

export interface WorkingDaysResult {
  workingDays: Date[];
  count: number;
}

/**
 * Expands an inclusive date range into its working days for the Israeli
 * work week (Sunday-Thursday), excluding Friday and Saturday. Pure and
 * synchronous - no database access, no framework types - so every Absences
 * feature can share this instead of reimplementing weekend exclusion.
 */
export function expandWorkingDays(
  start: Date,
  end: Date,
  options: ExpandWorkingDaysOptions = {},
): WorkingDaysResult {
  void options.holidayCalendar;

  if (end.getTime() < start.getTime()) {
    throw AppError.badRequest('End date must not be before start date');
  }

  const workingDays: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor.getTime() <= last.getTime()) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      workingDays.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { workingDays, count: workingDays.length };
}
