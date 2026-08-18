import { prisma } from '../config/prisma.js';
import { AppError } from '../types/errors.js';
import type { AbsenceType } from '../generated/prisma/enums.js';
import { checkAbsenceConflicts } from './absenceConflict.service.js';
import { expandWorkingDays } from './workingDays.service.js';

export interface AbsenceDto {
  id: string;
  userId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  workingDayCount: number;
}

function parseCalendarDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function calendarDateToUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function createAbsence(
  userId: string,
  input: { type: AbsenceType; startDate: string; endDate: string },
): Promise<AbsenceDto> {
  const startLocal = parseCalendarDate(input.startDate);
  const endLocal = parseCalendarDate(input.endDate);
  const { count } = expandWorkingDays(startLocal, endLocal);

  if (count === 0) {
    throw AppError.badRequest('Range contains no working days', [
      { field: 'startDate', message: 'Range contains no working days' },
    ]);
  }

  const startUtc = calendarDateToUtc(input.startDate);
  const endUtc = calendarDateToUtc(input.endDate);
  const { hasConflict, conflicts } = await checkAbsenceConflicts({
    userId,
    startDate: startUtc,
    endDate: endUtc,
    halfDay: false,
  });

  if (hasConflict) {
    throw AppError.conflict(
      'Absence conflicts with existing records',
      conflicts.map((conflict) => ({ field: conflict.date, message: conflict.reason })),
    );
  }

  const created = await prisma.absence.create({
    data: {
      userId,
      type: input.type,
      startDate: startUtc,
      endDate: endUtc,
      halfDay: false,
    },
  });

  return {
    id: created.id,
    userId: created.userId,
    type: created.type,
    startDate: toIsoDate(created.startDate),
    endDate: toIsoDate(created.endDate),
    halfDay: created.halfDay,
    workingDayCount: count,
  };
}

export async function listAbsencesForMonth(
  userId: string,
  month: number,
  year: number,
): Promise<AbsenceDto[]> {
  const rangeStart = new Date(Date.UTC(year, month - 1, 1));
  const rangeEnd = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.absence.findMany({
    where: {
      userId,
      startDate: { lt: rangeEnd },
      endDate: { gte: rangeStart },
    },
    orderBy: [{ startDate: 'desc' }],
  });

  return rows.map((row) => {
    const startIso = toIsoDate(row.startDate);
    const endIso = toIsoDate(row.endDate);
    const startLocal = parseCalendarDate(startIso);
    const endLocal = parseCalendarDate(endIso);
    const { count } = expandWorkingDays(startLocal, endLocal);
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      startDate: startIso,
      endDate: endIso,
      halfDay: row.halfDay,
      workingDayCount: count,
    };
  });
}

export async function deleteAbsence(userId: string, absenceId: string): Promise<void> {
  const row = await prisma.absence.findFirst({ where: { id: absenceId } });

  if (!row) {
    throw AppError.notFound('Absence not found');
  }

  if (row.userId !== userId) {
    throw AppError.forbidden();
  }

  await prisma.absence.delete({ where: { id: absenceId } });
}
