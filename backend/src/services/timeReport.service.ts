import { prisma } from '../config/prisma.js';
import type { WorkLocation } from '../generated/prisma/enums.js';
import { AppError } from '../types/errors.js';
import type { CreateTimeReportBody } from '../types/timeReport.schema.js';

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
  description: string;
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
    description: row.description,
  };
}

/**
 * Creates a time report for the authenticated caller. Assignment-to-task
 * filtering is SCRUM-71 — this slice only checks that the three ids form one
 * active client → project → task chain.
 */
export async function createTimeReport(userId: string, input: CreateTimeReportBody): Promise<TimeReportDto> {
  if (input.endTime < input.startTime) {
    throw AppError.badRequest('End time must not be before start time', [
      { field: 'endTime', message: 'End time must not be before start time' },
    ]);
  }

  const task = await prisma.task.findFirst({
    where: { id: input.taskId },
    include: { project: { include: { client: true } } },
  });

  if (
    !task ||
    !task.project.isActive ||
    !task.project.client.isActive ||
    task.projectId !== input.projectId ||
    task.project.clientId !== input.clientId
  ) {
    throw AppError.badRequest('Client, project, and task must form one active hierarchy', [
      { field: 'taskId', message: 'Client, project, and task must form one active hierarchy' },
    ]);
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
      description: input.description,
    },
  });

  return toDto(created);
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
