import { prisma } from '../config/prisma.js';
import { AbsenceType } from '../generated/prisma/enums.js';
import { isMonthLocked } from './monthLock.service.js';
import { isWeekendIso, listIsraeliHolidaysForYear, type IsraeliHolidayDate } from './israeliHolidays.calendar.js';

function calendarDateToUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(isoDate: string, days: number): string {
  const next = calendarDateToUtc(isoDate);
  next.setUTCDate(next.getUTCDate() + days);
  return toIsoDate(next);
}

export async function syncIsraeliHolidays(year: number): Promise<IsraeliHolidayDate[]> {
  const holidays = listIsraeliHolidaysForYear(year);
  const codes = holidays.map((row) => row.code);

  for (const holiday of holidays) {
    await prisma.israeliHoliday.upsert({
      where: { year_code: { year, code: holiday.code } },
      create: {
        year,
        code: holiday.code,
        nameHe: holiday.nameHe,
        date: calendarDateToUtc(holiday.date),
      },
      update: {
        nameHe: holiday.nameHe,
        date: calendarDateToUtc(holiday.date),
      },
    });
  }

  if (codes.length > 0) {
    await prisma.israeliHoliday.deleteMany({
      where: { year, code: { notIn: codes } },
    });
  }

  return holidays;
}

export async function listStoredHolidays(year: number): Promise<IsraeliHolidayDate[]> {
  await syncIsraeliHolidays(year);
  const rows = await prisma.israeliHoliday.findMany({
    where: { year },
    orderBy: { date: 'asc' },
  });
  return rows.map((row) => ({
    code: row.code as IsraeliHolidayDate['code'],
    nameHe: row.nameHe,
    date: toIsoDate(row.date),
  }));
}

async function splitAbsenceAroundDate(
  absence: { id: string; userId: string; type: AbsenceType; startDate: Date; endDate: Date; halfDay: boolean },
  holidayIso: string,
): Promise<void> {
  const startIso = toIsoDate(absence.startDate);
  const endIso = toIsoDate(absence.endDate);

  if (holidayIso < startIso || holidayIso > endIso) return;

  await prisma.absence.delete({ where: { id: absence.id } });

  const beforeEnd = addUtcDays(holidayIso, -1);
  const afterStart = addUtcDays(holidayIso, 1);

  if (startIso <= beforeEnd) {
    await prisma.absence.create({
      data: {
        userId: absence.userId,
        type: absence.type,
        startDate: calendarDateToUtc(startIso),
        endDate: calendarDateToUtc(beforeEnd),
        halfDay: absence.halfDay,
      },
    });
  }

  if (afterStart <= endIso) {
    await prisma.absence.create({
      data: {
        userId: absence.userId,
        type: absence.type,
        startDate: calendarDateToUtc(afterStart),
        endDate: calendarDateToUtc(endIso),
        halfDay: absence.halfDay,
      },
    });
  }
}

async function replaceOccupancyOnDate(userId: string, holidayIso: string): Promise<void> {
  const dayUtc = calendarDateToUtc(holidayIso);

  await prisma.timeReport.deleteMany({ where: { userId, date: dayUtc } });

  const overlapping = await prisma.absence.findMany({
    where: {
      userId,
      type: { not: AbsenceType.HOLIDAY },
      startDate: { lte: dayUtc },
      endDate: { gte: dayUtc },
    },
  });

  for (const row of overlapping) {
    await splitAbsenceAroundDate(row, holidayIso);
  }

  const existing = await prisma.absence.findFirst({
    where: {
      userId,
      type: AbsenceType.HOLIDAY,
      startDate: dayUtc,
      endDate: dayUtc,
    },
  });

  if (!existing) {
    await prisma.absence.create({
      data: {
        userId,
        type: AbsenceType.HOLIDAY,
        startDate: dayUtc,
        endDate: dayUtc,
      },
    });
  }
}

export async function ensureHolidayAbsencesForMonth(year: number, month: number): Promise<void> {
  const holidays = await syncIsraeliHolidays(year);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthHolidays = holidays.filter((row) => row.date.startsWith(prefix));
  if (monthHolidays.length === 0) return;

  const sampleIso = `${prefix}-01`;
  if (await isMonthLocked(sampleIso)) return;

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const holiday of monthHolidays) {
    if (isWeekendIso(holiday.date)) continue;
    for (const user of users) {
      await replaceOccupancyOnDate(user.id, holiday.date);
    }
  }
}
