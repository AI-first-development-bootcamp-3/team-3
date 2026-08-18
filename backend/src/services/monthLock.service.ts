import { prisma } from '../config/prisma.js';
import { AppError } from '../types/errors.js';

function calendarParts(isoDate: string): { year: number; month: number } {
  const [year, month] = isoDate.split('-');
  return { year: Number(year), month: Number(month) };
}

export async function isMonthLocked(isoDate: string): Promise<boolean> {
  const { year, month } = calendarParts(isoDate);
  const row = await prisma.monthLock.findUnique({
    where: { year_month: { year, month } },
  });
  return Boolean(row);
}

export async function assertMonthUnlocked(isoDate: string): Promise<void> {
  if (await isMonthLocked(isoDate)) {
    throw AppError.conflict('החודש נעול — לא ניתן לדווח');
  }
}
