import { prisma } from '../config/prisma.js';
import { AppError } from '../types/errors.js';
import type { AbsenceType } from '../generated/prisma/enums.js';
import { checkAbsenceConflicts } from './absenceConflict.service.js';
import { ensureHolidayAbsencesForMonth } from './israeliHolidays.service.js';
import { assertRangeUnlocked } from './monthLock.service.js';
import { expandWorkingDays } from './workingDays.service.js';

export interface AbsenceAttachmentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface AbsenceDto {
  id: string;
  userId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  workingDayCount: number;
  attachments: AbsenceAttachmentDto[];
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

function toAttachmentDto(row: {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}): AbsenceAttachmentDto {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

const HALF_DAY_WORKING_COUNT = 0.5;

export async function createAbsence(
  userId: string,
  input: { type: AbsenceType; startDate: string; endDate: string; halfDay?: boolean; attachmentIds?: string[] },
): Promise<AbsenceDto> {
  await assertRangeUnlocked(input.startDate, input.endDate);

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
  const halfDay = input.halfDay === true;

  const { hasConflict, conflicts } = await checkAbsenceConflicts({
    userId,
    startDate: startUtc,
    endDate: endUtc,
    halfDay,
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
      halfDay,
    },
  });

  // Link attachments to the absence if provided
  if (input.attachmentIds && input.attachmentIds.length > 0) {
    await prisma.attachment.updateMany({
      where: { id: { in: input.attachmentIds }, uploaderId: userId },
      data: { absenceId: created.id },
    });
  }

  const attachments = await prisma.attachment.findMany({ where: { absenceId: created.id } });

  return {
    id: created.id,
    userId: created.userId,
    type: created.type,
    startDate: toIsoDate(created.startDate),
    endDate: toIsoDate(created.endDate),
    halfDay: created.halfDay,
    workingDayCount: created.halfDay ? HALF_DAY_WORKING_COUNT : count,
    attachments: attachments.map(toAttachmentDto),
  };
}

export async function listAbsencesForMonth(
  userId: string,
  month: number,
  year: number,
): Promise<AbsenceDto[]> {
  await ensureHolidayAbsencesForMonth(year, month);

  const rangeStart = new Date(Date.UTC(year, month - 1, 1));
  const rangeEnd = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.absence.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lt: rangeEnd },
      endDate: { gte: rangeStart },
    },
    include: { documents: true },
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
      workingDayCount: row.halfDay ? HALF_DAY_WORKING_COUNT : count,
      attachments: row.documents.map(toAttachmentDto),
    };
  });
}

export async function updateAbsence(
  userId: string,
  absenceId: string,
  input: {
    type: AbsenceType;
    startDate: string;
    endDate: string;
    halfDay?: boolean;
    attachmentIds?: string[] | undefined;
  },
): Promise<AbsenceDto> {
  const existing = await prisma.absence.findFirst({ where: { id: absenceId, isActive: true } });

  if (!existing) {
    throw AppError.notFound('Absence not found');
  }

  if (existing.userId !== userId) {
    throw AppError.forbidden();
  }

  if (existing.type === 'HOLIDAY') {
    throw AppError.forbidden('לא ניתן לערוך יום חג');
  }

  if (input.type === 'HOLIDAY') {
    throw AppError.badRequest('Holiday absences are system-owned', [
      { field: 'type', message: 'Holiday absences are system-owned' },
    ]);
  }

  await assertRangeUnlocked(toIsoDate(existing.startDate), toIsoDate(existing.endDate));
  await assertRangeUnlocked(input.startDate, input.endDate);

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
  const halfDay = input.type !== 'VACATION' ? false : (input.halfDay ?? existing.halfDay);

  const { hasConflict, conflicts } = await checkAbsenceConflicts({
    userId,
    startDate: startUtc,
    endDate: endUtc,
    halfDay,
    excludeAbsenceId: absenceId,
  });

  if (hasConflict) {
    throw AppError.conflict(
      'Absence conflicts with existing records',
      conflicts.map((conflict) => ({ field: conflict.date, message: conflict.reason })),
    );
  }

  const updated = await prisma.absence.update({
    where: { id: absenceId },
    data: {
      type: input.type,
      startDate: startUtc,
      endDate: endUtc,
      halfDay,
    },
  });

  if (input.attachmentIds !== undefined) {
    if (input.attachmentIds.length === 0) {
      await prisma.attachment.updateMany({
        where: { absenceId },
        data: { absenceId: null },
      });
    } else {
      await prisma.attachment.updateMany({
        where: { absenceId, id: { notIn: input.attachmentIds } },
        data: { absenceId: null },
      });
      await prisma.attachment.updateMany({
        where: { id: { in: input.attachmentIds }, uploaderId: userId },
        data: { absenceId },
      });
    }
  }

  const attachments = await prisma.attachment.findMany({ where: { absenceId } });

  return {
    id: updated.id,
    userId: updated.userId,
    type: updated.type,
    startDate: toIsoDate(updated.startDate),
    endDate: toIsoDate(updated.endDate),
    halfDay: updated.halfDay,
    workingDayCount: updated.halfDay ? HALF_DAY_WORKING_COUNT : count,
    attachments: attachments.map(toAttachmentDto),
  };
}

export async function deleteAbsence(userId: string, absenceId: string): Promise<void> {
  const row = await prisma.absence.findFirst({ where: { id: absenceId } });

  if (!row) {
    throw AppError.notFound('Absence not found');
  }

  if (row.userId !== userId) {
    throw AppError.forbidden();
  }

  if (row.type === 'HOLIDAY') {
    throw AppError.forbidden('לא ניתן למחוק יום חג');
  }

  await assertRangeUnlocked(toIsoDate(row.startDate), toIsoDate(row.endDate));

  await prisma.absence.update({
    where: { id: absenceId },
    data: { isActive: false },
  });
}

export async function hasHalfDayVacationOnDate(userId: string, isoDate: string): Promise<boolean> {
  const dayUtc = calendarDateToUtc(isoDate);
  const row = await prisma.absence.findFirst({
    where: {
      userId,
      type: 'VACATION',
      halfDay: true,
      startDate: { lte: dayUtc },
      endDate: { gte: dayUtc },
    },
    select: { id: true },
  });
  return Boolean(row);
}
