import { prisma } from '../config/prisma.js';
import type { AbsenceType } from '../generated/prisma/enums.js';
import { AppError, type ErrorDetail } from '../types/errors.js';
import type { CreateAbsenceBody } from '../types/absence.schema.js';
import { checkAbsenceConflicts, type AbsenceConflictReason } from './absenceConflict.service.js';
import { expandWorkingDays } from './workingDays.service.js';

export interface AbsenceDto {
  id: string;
  userId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  workingDaysCount: number;
}

function calendarDateToDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function dateToCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const CONFLICT_MESSAGES: Record<AbsenceConflictReason, string> = {
  OVERLAPPING_ABSENCE: 'התאריך חופף להיעדרות קיימת',
  WORK_HOURS_CONFLICT: 'קיים דיווח שעות בתאריך זה',
};

/**
 * Creates an absence for the authenticated caller. `endDate` defaults to
 * `startDate` for a single-day absence (createAbsenceBodySchema's own
 * refine already rejects an explicit endDate before startDate). Runs the
 * shared conflict check before writing anything - a hit rejects the whole
 * request with 409, naming every clashing date, per absences-employee-report
 * design.md's decision to reuse the ErrorDetail[] shape for both 400 and 409.
 */
export async function createAbsence(userId: string, input: CreateAbsenceBody): Promise<AbsenceDto> {
  const startDate = calendarDateToDate(input.startDate);
  const endDate = calendarDateToDate(input.endDate ?? input.startDate);

  const { count: workingDaysCount } = expandWorkingDays(startDate, endDate);

  const { hasConflict, conflicts } = await checkAbsenceConflicts({
    userId,
    startDate,
    endDate,
    halfDay: input.halfDay,
  });

  if (hasConflict) {
    const details: ErrorDetail[] = conflicts.map((conflict) => ({
      field: conflict.date,
      message: CONFLICT_MESSAGES[conflict.reason],
    }));
    throw AppError.conflict('התאריכים המבוקשים חופפים להיעדרות או לדיווח קיים', details);
  }

  const created = await prisma.absence.create({
    data: {
      userId,
      type: input.type,
      startDate,
      endDate,
      halfDay: input.halfDay,
    },
  });

  return {
    id: created.id,
    userId: created.userId,
    type: created.type,
    startDate: dateToCalendarDate(created.startDate),
    endDate: dateToCalendarDate(created.endDate),
    halfDay: created.halfDay,
    workingDaysCount,
  };
}