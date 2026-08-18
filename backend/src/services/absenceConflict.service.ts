import { prisma } from '../config/prisma.js';
import { AppError } from '../types/errors.js';

const STANDARD_DAY_HOURS = 9;
const HALF_DAY_HOURS = 4.5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AbsenceConflictReason = 'OVERLAPPING_ABSENCE' | 'WORK_HOURS_CONFLICT';

export interface AbsenceConflict {
  /** ISO YYYY-MM-DD */
  date: string;
  reason: AbsenceConflictReason;
}

export interface AbsenceConflictCheckResult {
  hasConflict: boolean;
  conflicts: AbsenceConflict[];
}

export interface CheckAbsenceConflictsInput {
  userId: string;
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
  /** Pass the absence's own id when checking an edit, so it doesn't conflict with its own prior record. */
  excludeAbsenceId?: string;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function* eachDateUTC(start: Date, end: Date): Generator<Date> {
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  while (cursor <= last) {
    yield new Date(cursor);
    cursor += DAY_MS;
  }
}

/**
 * Shared by the absence create and edit paths (SCRUM-157): checks a proposed
 * absence against the user's existing absences and reported work hours, and
 * returns every conflicting date plus why. A full-day absence claims all 9
 * standard hours of a date - any reported work hours on that date conflict.
 * A half-day absence claims 4.5 - only reported hours beyond that conflict
 * (see openspec/changes/absence-conflict-validation/design.md - Decisions).
 * Cancelled absences are excluded automatically by the soft-delete extension
 * on `prisma.absence`, not reimplemented here.
 *
 * Returns structured, locale-agnostic data only - composing a user-facing
 * (Hebrew) message from the returned dates/reasons is the caller's job.
 */
export async function checkAbsenceConflicts(
  input: CheckAbsenceConflictsInput,
): Promise<AbsenceConflictCheckResult> {
  const { userId, halfDay, excludeAbsenceId } = input;
  // Normalize once so every comparison and query below operates on UTC-midnight
  // dates consistently - callers may pass Date objects carrying a time-of-day.
  const startDate = toUTCMidnight(input.startDate);
  const endDate = toUTCMidnight(input.endDate);

  if (endDate.getTime() < startDate.getTime()) {
    throw AppError.badRequest('End date must not be before start date');
  }

  const [overlappingAbsences, timeReports] = await Promise.all([
    prisma.absence.findMany({
      where: {
        userId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(excludeAbsenceId ? { id: { not: excludeAbsenceId } } : {}),
      },
      select: { startDate: true, endDate: true },
    }),
    prisma.timeReport.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      select: { date: true, startTime: true, endTime: true },
    }),
  ]);

  const conflicts = new Map<string, AbsenceConflict>();

  for (const absence of overlappingAbsences) {
    const overlapStart = absence.startDate.getTime() > startDate.getTime() ? absence.startDate : startDate;
    const overlapEnd = absence.endDate.getTime() < endDate.getTime() ? absence.endDate : endDate;
    for (const date of eachDateUTC(overlapStart, overlapEnd)) {
      const iso = toISODate(date);
      conflicts.set(`${iso}|OVERLAPPING_ABSENCE`, { date: iso, reason: 'OVERLAPPING_ABSENCE' });
    }
  }

  const reportedHoursByDate = new Map<string, number>();
  for (const report of timeReports) {
    const iso = toISODate(report.date);
    const hours = (report.endTime.getTime() - report.startTime.getTime()) / (60 * 60 * 1000);
    reportedHoursByDate.set(iso, (reportedHoursByDate.get(iso) ?? 0) + hours);
  }

  const claimedHours = halfDay ? HALF_DAY_HOURS : STANDARD_DAY_HOURS;
  const remainingBudget = STANDARD_DAY_HOURS - claimedHours;

  for (const date of eachDateUTC(startDate, endDate)) {
    const iso = toISODate(date);
    const reportedHours = reportedHoursByDate.get(iso) ?? 0;
    if (reportedHours > remainingBudget) {
      conflicts.set(`${iso}|WORK_HOURS_CONFLICT`, { date: iso, reason: 'WORK_HOURS_CONFLICT' });
    }
  }

  const sortedConflicts = Array.from(conflicts.values()).sort(
    (a, b) => a.date.localeCompare(b.date) || a.reason.localeCompare(b.reason),
  );

  return { hasConflict: sortedConflicts.length > 0, conflicts: sortedConflicts };
}
