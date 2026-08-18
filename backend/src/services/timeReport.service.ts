import { prisma } from '../config/prisma.js';
import { allocationsFitWindow } from '../lib/attendanceWindow.js';
import type { WorkLocation } from '../generated/prisma/enums.js';
import { AppError, type ErrorDetail } from '../types/errors.js';
import type {
  CreateTimeReportBatchBody,
  CreateTimeReportBody,
} from '../types/timeReport.schema.js';

export interface TimeReportDto {
  id: string;
  userId: string;
  clientId: string;
  projectId: string;
  taskId: string;
  date: string;
  workLocation: WorkLocation;
  startTime: string;
  endTime: string;
  hours: number;
  description: string;
}

export interface TimeReportListItemDto extends TimeReportDto {
  clientName: string;
  projectName: string;
  taskName: string;
  durationHours: number;
}

export interface ReportingTaskOption {
  id: string;
  name: string;
}

export interface ReportingProjectOption {
  id: string;
  name: string;
  tasks: ReportingTaskOption[];
}

export interface ReportingClientOption {
  id: string;
  name: string;
  projects: ReportingProjectOption[];
}

export interface ReportingOptions {
  clients: ReportingClientOption[];
}

function hhmmToDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

function dateToHhmm(value: Date): string {
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
}

function calendarDateToDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function dateToCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDto(row: {
  id: string;
  userId: string;
  clientId: string;
  projectId: string;
  taskId: string;
  date: Date;
  workLocation: WorkLocation;
  startTime: Date;
  endTime: Date;
  hours: { toNumber?: () => number } | number | string;
  description: string;
}): TimeReportDto {
  return {
    id: row.id,
    userId: row.userId,
    clientId: row.clientId,
    projectId: row.projectId,
    taskId: row.taskId,
    date: dateToCalendarDate(row.date),
    workLocation: row.workLocation,
    startTime: dateToHhmm(row.startTime),
    endTime: dateToHhmm(row.endTime),
    hours: Number(row.hours),
    description: row.description,
  };
}

const HIERARCHY_MISMATCH = 'Client, project, and task must form one active hierarchy';
const HOURS_EXCEED_WINDOW = 'Project hours cannot exceed the attendance window';

interface HierarchyIds {
  clientId: string;
  projectId: string;
  taskId: string;
}

/**
 * Soft-deleted tasks are already filtered out by the Prisma extension, so a
 * missing row here means "unknown or deactivated task".
 */
function isOneActiveHierarchy(
  task:
    | { projectId: string; project: { isActive: boolean; clientId: string; client: { isActive: boolean } } }
    | undefined
    | null,
  ids: HierarchyIds,
): boolean {
  return Boolean(
    task &&
      task.project.isActive &&
      task.project.client.isActive &&
      task.projectId === ids.projectId &&
      task.project.clientId === ids.clientId,
  );
}

/**
 * Creates a time report for the authenticated caller. Assignment-to-task
 * filtering is SCRUM-71 — this slice only checks that the three ids form one
 * active client → project → task chain.
 */
export async function createTimeReport(userId: string, input: CreateTimeReportBody): Promise<TimeReportDto> {
  if (!allocationsFitWindow(input.startTime, input.endTime, [input.hours])) {
    throw new AppError(400, 'HOURS_EXCEED_WINDOW', HOURS_EXCEED_WINDOW, [
      { field: 'hours', message: HOURS_EXCEED_WINDOW },
    ]);
  }

  const task = await prisma.task.findFirst({
    where: { id: input.taskId },
    include: { project: { include: { client: true } } },
  });

  if (!isOneActiveHierarchy(task, input)) {
    throw AppError.badRequest(HIERARCHY_MISMATCH, [{ field: 'taskId', message: HIERARCHY_MISMATCH }]);
  }

  const created = await prisma.timeReport.create({
    data: {
      userId,
      clientId: input.clientId,
      projectId: input.projectId,
      taskId: input.taskId,
      date: calendarDateToDate(input.date),
      workLocation: input.workLocation,
      startTime: hhmmToDate(input.startTime),
      endTime: hhmmToDate(input.endTime),
      hours: input.hours,
      description: input.description,
    },
  });

  return toDto(created);
}

/**
 * Replaces every project row of one day for this caller. Existing rows on that
 * date are removed in the same transaction as the insert, so a later save (or
 * deleting a card then saving) cannot stack duplicate hours. Rows are validated
 * first; a day is never left half saved.
 */
export async function createTimeReportBatch(
  userId: string,
  input: CreateTimeReportBatchBody,
): Promise<TimeReportDto[]> {
  const tasks = await prisma.task.findMany({
    where: { id: { in: input.rows.map((row) => row.taskId) } },
    include: { project: { include: { client: true } } },
  });
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  const details: ErrorDetail[] = [];
  input.rows.forEach((row, index) => {
    if (!isOneActiveHierarchy(tasksById.get(row.taskId), row)) {
      details.push({ field: `rows.${index}.taskId`, message: HIERARCHY_MISMATCH });
    }
  });

  if (details.length > 0) {
    throw AppError.badRequest('One or more report rows are invalid', details);
  }

  if (!allocationsFitWindow(input.startTime, input.endTime, input.rows.map((row) => row.hours))) {
    throw new AppError(400, 'HOURS_EXCEED_WINDOW', HOURS_EXCEED_WINDOW, [
      { field: 'hours', message: HOURS_EXCEED_WINDOW },
    ]);
  }

  const date = calendarDateToDate(input.date);
  const created = await prisma.$transaction(async (tx) => {
    await tx.timeReport.deleteMany({ where: { userId, date } });
    return Promise.all(
      input.rows.map((row) =>
        tx.timeReport.create({
          data: {
            userId,
            clientId: row.clientId,
            projectId: row.projectId,
            taskId: row.taskId,
            date,
            workLocation: row.workLocation,
            startTime: hhmmToDate(input.startTime),
            endTime: hhmmToDate(input.endTime),
            hours: row.hours,
            description: row.description,
          },
        }),
      ),
    );
  });

  return created.map(toDto);
}

/** Returns every row the caller saved in the given calendar month, newest day first. */
export async function listTimeReportsForMonth(
  userId: string,
  month: number,
  year: number,
): Promise<TimeReportListItemDto[]> {
  const rangeStart = new Date(Date.UTC(year, month - 1, 1));
  const rangeEnd = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.timeReport.findMany({
    where: {
      userId,
      date: { gte: rangeStart, lt: rangeEnd },
    },
    include: {
      client: { select: { name: true } },
      project: { select: { name: true } },
      task: { select: { name: true } },
    },
    orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
  });

  return rows.map((row) => ({
    ...toDto(row),
    clientName: row.client.name,
    projectName: row.project.name,
    taskName: row.task.name,
    durationHours: Number(row.hours),
  }));
}

/** Removes every row the caller saved on one calendar date. Other users are untouched. */
export async function deleteTimeReportsForDate(userId: string, date: string): Promise<void> {
  const result = await prisma.timeReport.deleteMany({
    where: {
      userId,
      date: calendarDateToDate(date),
    },
  });

  if (result.count === 0) {
    throw AppError.notFound('No time reports for this date');
  }
}

export async function listReportingOptions(): Promise<ReportingOptions> {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      projects: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          tasks: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return {
    clients: clients
      .map((client) => ({
        ...client,
        projects: client.projects.filter((project) => project.tasks.length > 0),
      }))
      .filter((client) => client.projects.length > 0),
  };
}
