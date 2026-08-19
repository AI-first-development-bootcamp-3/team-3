import { prisma } from '../config/prisma.js';
import { assertMonthUnlocked } from './monthLock.service.js';
import { isIsoDayInProjectWindow } from './projectWindow.service.js';
import { AppError } from '../types/errors.js';

function todayJerusalem(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function countAssignedTasks(userId: string): Promise<number> {
  return prisma.taskAssignment.count({
    where: {
      userId,
      task: { isActive: true, project: { isActive: true, client: { isActive: true } } },
    },
  });
}

/** Full-day absence on `isoDate` blocks clock start; half-day does not. */
export async function hasFullDayAbsence(userId: string, isoDate: string): Promise<boolean> {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  const row = await prisma.absence.findFirst({
    where: {
      userId,
      isActive: true,
      halfDay: false,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });
  return Boolean(row);
}

export async function assertCanStartClock(userId: string): Promise<void> {
  const today = todayJerusalem();
  await assertMonthUnlocked(today);

  if ((await countAssignedTasks(userId)) === 0) {
    throw AppError.conflict('אין משימות מוקצות');
  }

  const assigned = await prisma.taskAssignment.findMany({
    where: {
      userId,
      task: { isActive: true, project: { isActive: true, client: { isActive: true } } },
    },
    select: { task: { select: { project: { select: { startDate: true, endDate: true } } } } },
  });
  const todayInWindow = assigned.some((row) => isIsoDayInProjectWindow(today, row.task.project));
  if (!todayInWindow) {
    throw AppError.conflict('היום מחוץ לטווח הפרויקט');
  }

  if (await hasFullDayAbsence(userId, today)) {
    throw AppError.conflict('קיים דיווח היעדרות מלא ליום זה');
  }

  const open = await prisma.workClockSession.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'AWAITING_CONFIRM'] },
    },
  });
  if (open) {
    throw AppError.conflict('כבר קיים שעון פעיל או טיוטה ממתינה');
  }
}

export async function assertCanStopClock(sessionStartedAt: Date): Promise<void> {
  const startDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(sessionStartedAt);
  await assertMonthUnlocked(startDate);
}
