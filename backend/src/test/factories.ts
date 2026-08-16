import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { AbsenceType, Role } from '../generated/prisma/enums.js';
import type { AbsenceModel, ClientModel, ProjectModel, TaskModel, UserModel } from '../generated/prisma/models.js';

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
  overrides: Partial<Pick<ProjectModel, 'name' | 'isActive' | 'clientId'>> = {},
): Promise<ProjectModel> {
  const clientId = overrides.clientId ?? (await createClient()).id;

  return prisma.project.create({
    data: {
      name: overrides.name ?? `Project ${crypto.randomUUID()}`,
      clientId,
      ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
    },
  });
}

export async function createTask(
  overrides: Partial<Pick<TaskModel, 'name' | 'isActive' | 'projectId'>> = {},
): Promise<TaskModel> {
  const projectId = overrides.projectId ?? (await createProject()).id;

  return prisma.task.create({
    data: {
      name: overrides.name ?? `Task ${crypto.randomUUID()}`,
      projectId,
      ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
    },
  });
}

export async function createAbsence(
  overrides: Partial<
    Pick<AbsenceModel, 'userId' | 'type' | 'startDate' | 'endDate' | 'halfDay' | 'isActive'>
  > = {},
): Promise<AbsenceModel> {
  const userId = overrides.userId ?? (await createUser()).id;
  const singleDay = new Date('2026-01-05');

  return prisma.absence.create({
    data: {
      userId,
      type: overrides.type ?? AbsenceType.VACATION,
      startDate: overrides.startDate ?? singleDay,
      endDate: overrides.endDate ?? singleDay,
      ...(overrides.halfDay !== undefined ? { halfDay: overrides.halfDay } : {}),
      ...(overrides.isActive !== undefined ? { isActive: overrides.isActive } : {}),
    },
  });
}
