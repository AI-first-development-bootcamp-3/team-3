import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../types/errors.js';

function calendarParts(isoDate: string): { year: number; month: number } {
  const [year, month] = isoDate.split('-');
  return { year: Number(year), month: Number(month) };
}

export interface MonthLockDto {
  year: number;
  month: number;
  lockedAt: string;
  lockedById: string;
}

function toDto(row: { year: number; month: number; lockedAt: Date; lockedById: string }): MonthLockDto {
  return {
    year: row.year,
    month: row.month,
    lockedAt: row.lockedAt.toISOString(),
    lockedById: row.lockedById,
  };
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

export async function listMonthLocks(year: number): Promise<MonthLockDto[]> {
  const rows = await prisma.monthLock.findMany({
    where: { year },
    orderBy: { month: 'asc' },
  });
  return rows.map(toDto);
}

export async function lockMonth(year: number, month: number, lockedById: string): Promise<MonthLockDto> {
  try {
    const row = await prisma.monthLock.create({
      data: { year, month, lockedById },
    });
    return toDto(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('החודש כבר נעול');
    }
    throw error;
  }
}

export async function unlockMonth(year: number, month: number): Promise<void> {
  try {
    await prisma.monthLock.delete({
      where: { year_month: { year, month } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw AppError.notFound('החודש אינו נעול');
    }
    throw error;
  }
}
