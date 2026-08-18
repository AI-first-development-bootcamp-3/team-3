import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { AbsenceType, Role } from '../generated/prisma/enums.js';
import type {
  AbsenceModel,
  ClientModel,
  ProjectModel,
  TaskModel,
  TimeReportModel,
  UserModel,
} from '../generated/prisma/models.js';

/**
 * Test data factories for the core entities, so integration tests build
 * exactly the rows they need inline instead of relying on hand-written
 * fixtures. Each field defaults to something valid and unique; pass an
 * override for anything a test cares about.
 */

export async function createUser(
  overrides: Partial<
    Pick<UserModel, 'email' | 'passwordHash' | 'displayName' | 'role' | 'isActive' | 'mustChangePassword'>
  > = {},
): Promise<UserModel> {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${crypto.randomUUID()}@example.test`,
      passwordHash: overrides.passwordHash ?? (await bcrypt.hash('password123', 4)),
      displayName: overrides.displayName ?? 'Test User',
      role: overrides.role ?? Role.EMPLOYEE,
      mustChangePassword: overrides.mustChangePassword ?? false,
      ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
    },
  });
}

export async function createClient(overrides: Partial<Pick<ClientModel, 'name' | 'isActive'>> = {}): Promise<ClientModel> {
  return prisma.client.create({
    data: {
      name: overrides.name ?? `Client ${crypto.randomUUID()}`,
      ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
    },
  });
}

export async function createProject(
  overrides: Partial<Pick<ProjectModel, 'name' | 'isActive' | 'clientId' | 'reportFormat'>> = {},
): Promise<ProjectModel> {
  const clientId = overrides.clientId ?? (await createClient()).id;

  return prisma.project.create({
    data: {
      name: overrides.name ?? `Project ${crypto.randomUUID()}`,
      clientId,
      ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
      ...(overrides.reportFormat !== undefined ? { reportFormat: overrides.reportFormat } : {}),
    },
  });
}

export async function createTask(
  overrides: Partial<Pick<TaskModel, 'name' | 'isActive' | 'projectId' | 'status'>> = {},
): Promise<TaskModel> {
  const projectId = overrides.projectId ?? (await createProject()).id;

  return prisma.task.create({
    data: {
      name: overrides.name ?? `Task ${crypto.randomUUID()}`,
      projectId,
      ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
      ...(overrides.status !== undefined ? { status: overrides.status } : {}),
    },
  });
}

export async function assignTask(userId: string, taskId: string): Promise<void> {
  await prisma.taskAssignment.upsert({
    where: { userId_taskId: { userId, taskId } },
    update: {},
    create: { userId, taskId },
  });
}

export async function createTimeReport(
  overrides: Partial<
    Pick<
      TimeReportModel,
      | 'userId'
      | 'clientId'
      | 'projectId'
      | 'taskId'
      | 'date'
      | 'workLocation'
      | 'startTime'
      | 'endTime'
      | 'hours'
      | 'description'
    >
  > = {},
): Promise<TimeReportModel> {
  let taskId: string;
  let projectId: string;
  let clientId: string;

  if (overrides.taskId) {
    const task = await prisma.task.findFirstOrThrow({
      where: { id: overrides.taskId },
      include: { project: true },
    });
    taskId = task.id;
    projectId = overrides.projectId ?? task.projectId;
    clientId = overrides.clientId ?? task.project.clientId;
  } else {
    const task = await createTask(overrides.projectId ? { projectId: overrides.projectId } : {});
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });
    taskId = task.id;
    projectId = overrides.projectId ?? task.projectId;
    clientId = overrides.clientId ?? project.clientId;
  }

  return prisma.timeReport.create({
    data: {
      userId: overrides.userId ?? (await createUser()).id,
      clientId,
      projectId,
      taskId,
      date: overrides.date ?? new Date('2026-08-16T00:00:00.000Z'),
      workLocation: overrides.workLocation ?? 'OFFICE',
      startTime: overrides.startTime ?? new Date('1970-01-01T09:00:00.000Z'),
      endTime: overrides.endTime ?? new Date('1970-01-01T18:00:00.000Z'),
      hours: overrides.hours ?? 9,
      description: overrides.description ?? 'Test report',
    },
  });
}

export async function createAbsence(
  overrides: Partial<Pick<AbsenceModel, 'userId' | 'type' | 'startDate' | 'endDate' | 'halfDay' | 'isActive'>> = {},
): Promise<AbsenceModel> {
  return prisma.absence.create({
    data: {
      userId: overrides.userId ?? (await createUser()).id,
      type: overrides.type ?? AbsenceType.VACATION,
      startDate: overrides.startDate ?? new Date('2026-08-16T00:00:00.000Z'),
      endDate: overrides.endDate ?? new Date('2026-08-16T00:00:00.000Z'),
      ...(overrides.halfDay !== undefined ? { halfDay: overrides.halfDay } : {}),
      ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
    },
  });
}
