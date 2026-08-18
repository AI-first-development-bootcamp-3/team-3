import { prisma } from '../config/prisma.js';
import type { WorkClockSessionStatus } from '../generated/prisma/enums.js';
import {
  computeClockSegments,
  segmentHours,
  type ClockSegment,
} from '../lib/clockSegments.js';
import { AppError } from '../types/errors.js';
import { assertCanStartClock, assertCanStopClock } from './workClockGates.service.js';

export interface ClockSessionDto {
  sessionId: string;
  status: WorkClockSessionStatus;
  startedAt: string;
  stoppedAt: string | null;
  autoStopped: boolean;
  segments: ClockSegment[];
}

function toDto(row: {
  id: string;
  status: WorkClockSessionStatus;
  startedAt: Date;
  stoppedAt: Date | null;
  autoStopped: boolean;
}): Omit<ClockSessionDto, 'segments'> {
  return {
    sessionId: row.id,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    stoppedAt: row.stoppedAt?.toISOString() ?? null,
    autoStopped: row.autoStopped,
  };
}

function segmentsForSession(startedAt: Date, stoppedAt: Date | null): ClockSegment[] {
  if (!stoppedAt) return [];
  return computeClockSegments(startedAt, stoppedAt);
}

export async function getClockSession(userId: string): Promise<ClockSessionDto | null> {
  const row = await prisma.workClockSession.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'AWAITING_CONFIRM'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;

  return {
    ...toDto(row),
    segments: segmentsForSession(row.startedAt, row.stoppedAt),
  };
}

export async function startClockSession(userId: string): Promise<ClockSessionDto> {
  await assertCanStartClock(userId);

  const created = await prisma.workClockSession.create({
    data: {
      userId,
      startedAt: new Date(),
      status: 'ACTIVE',
    },
  });

  return {
    ...toDto(created),
    segments: [],
  };
}

export async function stopClockSession(userId: string): Promise<ClockSessionDto> {
  const row = await prisma.workClockSession.findFirst({
    where: { userId, status: 'ACTIVE' },
  });
  if (!row) {
    throw AppError.notFound('No active clock session');
  }

  await assertCanStopClock(row.startedAt);

  const stoppedAt = new Date();
  const updated = await prisma.workClockSession.update({
    where: { id: row.id },
    data: {
      stoppedAt,
      status: 'AWAITING_CONFIRM',
    },
  });

  const segments = segmentsForSession(updated.startedAt, updated.stoppedAt);

  return {
    ...toDto(updated),
    segments,
  };
}

export async function discardClockSession(userId: string): Promise<void> {
  const row = await prisma.workClockSession.findFirst({
    where: { userId, status: 'AWAITING_CONFIRM' },
  });
  if (!row) {
    throw AppError.notFound('No clock draft to discard');
  }

  await prisma.workClockSession.update({
    where: { id: row.id },
    data: { status: 'DISCARDED' },
  });
}

export async function completeClockSession(userId: string): Promise<void> {
  const row = await prisma.workClockSession.findFirst({
    where: { userId, status: 'AWAITING_CONFIRM' },
  });
  if (!row) return;

  await prisma.workClockSession.update({
    where: { id: row.id },
    data: { status: 'DISCARDED' },
  });
}

export function clockSegmentToReportHours(segment: ClockSegment): number {
  return segmentHours(segment);
}

/** Auto-stop all ACTIVE sessions at end of Jerusalem calendar day (called by cron). */
export async function autoStopActiveSessionsForJerusalemDate(isoDate: string): Promise<number> {
  const dayEnd = new Date(`${isoDate}T23:59:59.999Z`);

  const active = await prisma.workClockSession.findMany({
    where: { status: 'ACTIVE', startedAt: { lte: dayEnd } },
  });

  let count = 0;
  for (const session of active) {
    await prisma.workClockSession.update({
      where: { id: session.id },
      data: {
        stoppedAt: dayEnd,
        status: 'AWAITING_CONFIRM',
        autoStopped: true,
      },
    });
    count += 1;
  }
  return count;
}

/** Test helper: run EOD auto-stop for "today" in Jerusalem. */
export async function autoStopActiveSessionsNow(): Promise<number> {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return autoStopActiveSessionsForJerusalemDate(today);
}

export async function isTaskAssignedToUser(userId: string, taskId: string): Promise<boolean> {
  const row = await prisma.taskAssignment.findUnique({
    where: { userId_taskId: { userId, taskId } },
  });
  return Boolean(row);
}
