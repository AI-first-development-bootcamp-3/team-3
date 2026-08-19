import { prisma } from '../config/prisma.js';
import {
  allocationsFitWindow,
  attendanceWindowMinutes,
  derivedHoursFromMinutes,
  intervalsOverlap,
  rowIntervalOnDayAxis,
  type RowInterval,
} from '../lib/attendanceWindow.js';
import { Prisma } from '../generated/prisma/client.js';
import type { ReportFormat, TimeReportAuditAction, WorkLocation } from '../generated/prisma/enums.js';
import { AppError, type ErrorDetail } from '../types/errors.js';
import { assertIsoDayInProjectWindow, isIsoDayInProjectWindow, PROJECT_OUTSIDE_WINDOW } from './projectWindow.service.js';
import { ensureHolidayAbsencesForMonth } from './israeliHolidays.service.js';
import { hasHalfDayVacationOnDate } from './absence.service.js';
import { assertMonthUnlocked } from './monthLock.service.js';
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
  /** The day's attendance window, shared by every row of the day. */
  startTime: string;
  endTime: string;
  /** This row's own clock pair — present only on a CLOCK_IN_OUT row. */
  rowStartTime: string | null;
  rowEndTime: string | null;
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
  /** Decides which fields the entry form collects for rows on this project. */
  reportFormat: ReportFormat;
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

/** Written only when an administrator edits another employee's day. */
export interface TimeReportAuditWrite {
  actorId: string;
  reason?: string;
}

export interface TimeReportAuditDto {
  id: string;
  employeeId: string;
  actorId: string;
  actorName: string;
  date: string;
  action: TimeReportAuditAction;
  previousJson: Prisma.JsonValue;
  nextJson: Prisma.JsonValue | null;
  reason: string | null;
  createdAt: string;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function auditReason(reason: string | undefined): string | null {
  const trimmed = reason?.trim();
  return trimmed ? trimmed : null;
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
  rowStartTime: Date | null;
  rowEndTime: Date | null;
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
    rowStartTime: row.rowStartTime ? dateToHhmm(row.rowStartTime) : null,
    rowEndTime: row.rowEndTime ? dateToHhmm(row.rowEndTime) : null,
    hours: Number(row.hours),
    description: row.description,
  };
}

const HIERARCHY_MISMATCH = 'Client, project, and task must form one active hierarchy';
const TASK_NOT_ASSIGNED = 'You are not assigned to this task';
const HOURS_EXCEED_WINDOW = 'Project hours cannot exceed the attendance window';
const HALF_DAY_HOURS = 4.5;
const HOURS_NOT_ALLOWED = 'This project reports clock-in/clock-out, so it cannot carry hours';
const HOURS_REQUIRED = 'This project reports total hours, so hours are required';
const TIMES_NOT_ALLOWED = 'This project reports total hours, so it cannot carry row times';
const TIMES_REQUIRED = 'This project reports clock-in/clock-out, so both row times are required';
const ROW_OUTSIDE_WINDOW = 'Row times must fall inside the day attendance window';
const ROW_ZERO_LENGTH = 'Row end time must be later than its start time';
const ROWS_OVERLAP = 'Two projects cannot be clocked over the same stretch of time';

/**
 * A row resolved against its project's format: the hours it contributes, plus
 * its position on the day axis when it has a clock pair of its own.
 */
interface ResolvedRow {
  hours: number;
  interval: RowInterval | null;
}

interface FormatDependentRow {
  hours?: number | undefined;
  rowStartTime?: string | undefined;
  rowEndTime?: string | undefined;
}

/**
 * Validates one row against the format its project actually carries, and
 * derives the hours a clock-in/out row contributes. Details are pushed under
 * `fieldPrefix` so a batch names the failing row and a single report does not.
 */
function resolveRowForFormat(
  row: FormatDependentRow,
  reportFormat: ReportFormat,
  day: { startTime: string; endTime: string },
  fieldPrefix: string,
  details: ErrorDetail[],
): ResolvedRow | null {
  const hasTimes = row.rowStartTime !== undefined && row.rowEndTime !== undefined;
  const hasPartialTimes = row.rowStartTime !== undefined || row.rowEndTime !== undefined;

  if (reportFormat === 'SUM_HOURS') {
    if (hasPartialTimes) {
      details.push({ field: `${fieldPrefix}rowStartTime`, message: TIMES_NOT_ALLOWED });
      return null;
    }
    if (row.hours === undefined) {
      details.push({ field: `${fieldPrefix}hours`, message: HOURS_REQUIRED });
      return null;
    }
    return { hours: row.hours, interval: null };
  }

  if (row.hours !== undefined) {
    details.push({ field: `${fieldPrefix}hours`, message: HOURS_NOT_ALLOWED });
    return null;
  }
  if (!hasTimes) {
    details.push({ field: `${fieldPrefix}rowStartTime`, message: TIMES_REQUIRED });
    return null;
  }

  const interval = rowIntervalOnDayAxis(day.startTime, row.rowStartTime!, row.rowEndTime!);
  const windowMinutes = attendanceWindowMinutes(day.startTime, day.endTime);

  // Start is checked before length: a row that begins before the day does
  // (08:00 on a 09:00–18:00 day) lands late on the day axis, which would
  // otherwise surface as a backwards interval and blame the wrong field.
  if (interval.start >= windowMinutes) {
    details.push({ field: `${fieldPrefix}rowStartTime`, message: ROW_OUTSIDE_WINDOW });
    return null;
  }
  if (interval.end <= interval.start) {
    details.push({ field: `${fieldPrefix}rowEndTime`, message: ROW_ZERO_LENGTH });
    return null;
  }
  if (interval.end > windowMinutes) {
    details.push({ field: `${fieldPrefix}rowEndTime`, message: ROW_OUTSIDE_WINDOW });
    return null;
  }

  return { hours: derivedHoursFromMinutes(interval.end - interval.start), interval };
}

/**
 * You cannot be clocked into two projects at once. Every clashing row is named
 * rather than only the first, so the form can mark all of them at once.
 */
function collectOverlapDetails(
  intervals: { index: number; interval: RowInterval }[],
  details: ErrorDetail[],
): void {
  const clashing = new Set<number>();
  for (let i = 0; i < intervals.length; i += 1) {
    for (let j = i + 1; j < intervals.length; j += 1) {
      if (intervalsOverlap(intervals[i]!.interval, intervals[j]!.interval)) {
        clashing.add(intervals[i]!.index);
        clashing.add(intervals[j]!.index);
      }
    }
  }
  for (const index of [...clashing].sort((a, b) => a - b)) {
    details.push({ field: `rows.${index}.rowStartTime`, message: ROWS_OVERLAP });
  }
}

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
 * True when the caller holds an assignment row for this task. The task is
 * loaded with its assignments already narrowed to the caller, so a non-empty
 * list means "assigned" — nothing else can appear in it.
 */
function isAssignedToCaller(task: { assignments: unknown[] } | undefined | null): boolean {
  return Boolean(task && task.assignments.length > 0);
}

/**
 * Creates a time report for the authenticated caller. The three ids must form
 * one active client → project → task chain, and the caller must be assigned to
 * that task — reporting time against work you were never given is refused.
 */
export async function createTimeReport(userId: string, input: CreateTimeReportBody): Promise<TimeReportDto> {
  await assertMonthUnlocked(input.date);

  const task = await prisma.task.findFirst({
    where: { id: input.taskId },
    include: {
      project: { include: { client: true } },
      assignments: { where: { userId }, select: { userId: true } },
    },
  });

  if (!isOneActiveHierarchy(task, input)) {
    throw AppError.badRequest(HIERARCHY_MISMATCH, [{ field: 'taskId', message: HIERARCHY_MISMATCH }]);
  }

  if (!isAssignedToCaller(task)) {
    throw AppError.badRequest(TASK_NOT_ASSIGNED, [{ field: 'taskId', message: TASK_NOT_ASSIGNED }]);
  }

  assertIsoDayInProjectWindow(input.date, task!.project);

  // The hierarchy check above already proved the task, so its project's format
  // is the authority on which fields this row had to carry — never a body field.
  const details: ErrorDetail[] = [];
  const resolved = resolveRowForFormat(input, task!.project.reportFormat, input, '', details);

  if (!resolved) {
    throw AppError.badRequest('The report does not match its project reporting format', details);
  }

  if (!allocationsFitWindow(
    input.startTime,
    input.endTime,
    [resolved.hours],
    (await hasHalfDayVacationOnDate(userId, input.date)) ? HALF_DAY_HOURS : undefined,
  )) {
    throw new AppError(400, 'HOURS_EXCEED_WINDOW', HOURS_EXCEED_WINDOW, [
      { field: 'hours', message: HOURS_EXCEED_WINDOW },
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
      rowStartTime: input.rowStartTime ? hhmmToDate(input.rowStartTime) : null,
      rowEndTime: input.rowEndTime ? hhmmToDate(input.rowEndTime) : null,
      hours: resolved.hours,
      description: input.description,
    },
  });

  return toDto(created);
}

/** Keys a stored row by the pair that identifies it within one user's day. */
function rowKey(ids: { projectId: string; taskId: string }): string {
  return `${ids.projectId}:${ids.taskId}`;
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
  audit?: TimeReportAuditWrite,
): Promise<TimeReportDto[]> {
  if (!audit) {
    await assertMonthUnlocked(input.date);
  }
  const date = calendarDateToDate(input.date);

  const [tasks, storedRows] = await Promise.all([
    prisma.task.findMany({
      where: { id: { in: input.rows.map((row) => row.taskId) } },
      include: {
        project: { include: { client: true } },
        assignments: { where: { userId }, select: { userId: true } },
      },
    }),
    // Read before the transaction below deletes them: a row already reported
    // keeps the format it was reported under even if its project has since been
    // switched (design.md, D6). A row's own shape records that format — a clock
    // pair means CLOCK_IN_OUT, its absence means SUM_HOURS — so no extra column
    // is needed.
    prisma.timeReport.findMany({
      where: { userId, date },
      select: { projectId: true, taskId: true, rowStartTime: true },
    }),
  ]);
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const storedFormats = new Map<string, ReportFormat>(
    storedRows.map((row) => [
      rowKey(row),
      row.rowStartTime !== null ? 'CLOCK_IN_OUT' : 'SUM_HOURS',
    ]),
  );

  const details: ErrorDetail[] = [];
  input.rows.forEach((row, index) => {
    const task = tasksById.get(row.taskId);
    if (!isOneActiveHierarchy(task, row)) {
      details.push({ field: `rows.${index}.taskId`, message: HIERARCHY_MISMATCH });
      return;
    }
    // A row already stored for this caller on this date stays saveable even
    // after its assignment is withdrawn: an admin unassigning a task must not
    // strand a day the employee already submitted. Only a row that is new to
    // the day needs a live assignment. `storedFormats` is keyed by exactly
    // that — this user, this date, this project and task — so its presence is
    // the "already reported" signal.
    if (!isAssignedToCaller(task) && !storedFormats.has(rowKey(row))) {
      details.push({ field: `rows.${index}.taskId`, message: TASK_NOT_ASSIGNED });
    }
    if (task && !isIsoDayInProjectWindow(input.date, task.project)) {
      details.push({ field: `rows.${index}.projectId`, message: PROJECT_OUTSIDE_WINDOW });
    }
  });

  if (details.length > 0) {
    throw AppError.badRequest('One or more report rows are invalid', details);
  }

  // Rows of both formats may share a day, so each is resolved against its own
  // format before any of them is trusted: the format of the row already stored
  // for this project and task if there is one, and otherwise — a row being
  // added now — the project's current format.
  const resolved = input.rows.map((row, index) =>
    resolveRowForFormat(
      row,
      storedFormats.get(rowKey(row)) ?? tasksById.get(row.taskId)!.project.reportFormat,
      input,
      `rows.${index}.`,
      details,
    ),
  );

  if (details.length > 0) {
    throw AppError.badRequest('One or more report rows are invalid', details);
  }

  collectOverlapDetails(
    resolved.flatMap((entry, index) =>
      entry?.interval ? [{ index, interval: entry.interval }] : [],
    ),
    details,
  );

  if (details.length > 0) {
    throw AppError.badRequest('One or more report rows are invalid', details);
  }

  if (!allocationsFitWindow(
    input.startTime,
    input.endTime,
    resolved.map((entry) => entry!.hours),
    (await hasHalfDayVacationOnDate(userId, input.date)) ? HALF_DAY_HOURS : undefined,
  )) {
    throw new AppError(400, 'HOURS_EXCEED_WINDOW', HOURS_EXCEED_WINDOW, [
      { field: 'hours', message: HOURS_EXCEED_WINDOW },
    ]);
  }

  const created = await prisma.$transaction(async (tx) => {
    const previousRows = audit
      ? await tx.timeReport.findMany({
          where: { userId, date },
          orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        })
      : [];
    await tx.timeReport.deleteMany({ where: { userId, date } });
    const rows = await Promise.all(
      input.rows.map((row, index) =>
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
            rowStartTime: row.rowStartTime ? hhmmToDate(row.rowStartTime) : null,
            rowEndTime: row.rowEndTime ? hhmmToDate(row.rowEndTime) : null,
            hours: resolved[index]!.hours,
            description: row.description,
          },
        }),
      ),
    );
    if (audit) {
      await tx.timeReportAudit.create({
        data: {
          employeeId: userId,
          actorId: audit.actorId,
          date,
          action: 'REPLACED',
          previousJson: asJson(previousRows.map(toDto)),
          nextJson: asJson(rows.map(toDto)),
          reason: auditReason(audit.reason),
        },
      });
    }
    return rows;
  });

  return created.map(toDto);
}

/** Returns every row the caller saved in the given calendar month, newest day first. */
export async function listTimeReportsForMonth(
  userId: string,
  month: number,
  year: number,
): Promise<TimeReportListItemDto[]> {
  await ensureHolidayAbsencesForMonth(year, month);

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
export async function deleteTimeReportsForDate(
  userId: string,
  date: string,
  audit?: TimeReportAuditWrite,
): Promise<void> {
  const day = calendarDateToDate(date);

  if (!audit) {
    await assertMonthUnlocked(date);
    const result = await prisma.timeReport.deleteMany({
      where: { userId, date: day },
    });
    if (result.count === 0) {
      throw AppError.notFound('No time reports for this date');
    }
    return;
  }

  await prisma.$transaction(async (tx) => {
    const previousRows = await tx.timeReport.findMany({
      where: { userId, date: day },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    });

    if (previousRows.length === 0) {
      throw AppError.notFound('No time reports for this date');
    }

    await tx.timeReport.deleteMany({
      where: { userId, date: day },
    });

    await tx.timeReportAudit.create({
      data: {
        employeeId: userId,
        actorId: audit.actorId,
        date: day,
        action: 'DELETED',
        previousJson: asJson(previousRows.map(toDto)),
        reason: auditReason(audit.reason),
      },
    });
  });
}

export async function listTimeReportAudits(
  employeeId: string,
  month: number,
  year: number,
): Promise<TimeReportAuditDto[]> {
  const rangeStart = new Date(Date.UTC(year, month - 1, 1));
  const rangeEnd = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.timeReportAudit.findMany({
    where: {
      employeeId,
      date: { gte: rangeStart, lt: rangeEnd },
    },
    include: {
      actor: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    actorId: row.actorId,
    actorName: row.actor.displayName,
    date: dateToCalendarDate(row.date),
    action: row.action,
    previousJson: row.previousJson,
    nextJson: row.nextJson,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * The client → project → task tree this caller may report against: active
 * throughout, and narrowed to the tasks they are actually assigned to. The
 * narrowing is uniform across roles — an admin reporting their own time is
 * scoped by their own assignments exactly like an employee. Branches left
 * empty by the narrowing are pruned, so the tree never offers a dead end.
 */
export async function listReportingOptions(userId: string): Promise<ReportingOptions> {
  const [clients, counts] = await Promise.all([
    prisma.client.findMany({
      where: { isActive: true },
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
            reportFormat: true,
            tasks: {
              where: { isActive: true, assignments: { some: { userId } } },
              orderBy: { name: 'asc' },
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    prisma.timeReport.groupBy({
      by: ['clientId', 'projectId', 'taskId'],
      where: { userId },
      _count: { _all: true },
    }),
  ]);

  const taskCount = new Map<string, number>();
  const projectCount = new Map<string, number>();
  const clientCount = new Map<string, number>();
  for (const row of counts) {
    taskCount.set(row.taskId, (taskCount.get(row.taskId) ?? 0) + row._count._all);
    projectCount.set(row.projectId, (projectCount.get(row.projectId) ?? 0) + row._count._all);
    clientCount.set(row.clientId, (clientCount.get(row.clientId) ?? 0) + row._count._all);
  }

  const byCountThenName = (countOf: (id: string) => number) => {
    return (left: { id: string }, right: { id: string }) => countOf(right.id) - countOf(left.id);
  };

  return {
    clients: clients
      .map((client) => ({
        ...client,
        projects: client.projects
          .map((project) => ({
            ...project,
            tasks: [...project.tasks].sort(byCountThenName((id) => taskCount.get(id) ?? 0)),
          }))
          .filter((project) => project.tasks.length > 0)
          .sort(byCountThenName((id) => projectCount.get(id) ?? 0)),
      }))
      .filter((client) => client.projects.length > 0)
      .sort(byCountThenName((id) => clientCount.get(id) ?? 0)),
  };
}
