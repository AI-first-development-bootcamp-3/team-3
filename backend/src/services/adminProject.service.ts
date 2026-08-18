import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../types/errors.js';
import type { ReportFormat } from '../generated/prisma/enums.js';
import type { CreateProjectBody, UpdateProjectBody } from '../types/adminProject.schema.js';

export interface AdminProject {
  id: string;
  name: string;
  isActive: boolean;
  reportFormat: ReportFormat;
  clientId: string;
  clientName: string;
  managerId: string | null;
  managerName: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string;
}

const projectSelect = {
  id: true,
  name: true,
  isActive: true,
  reportFormat: true,
  clientId: true,
  managerId: true,
  startDate: true,
  endDate: true,
  description: true,
  client: { select: { name: true } },
  manager: { select: { displayName: true } },
} as const;

function toIsoDay(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toDto(row: {
  id: string;
  name: string;
  isActive: boolean;
  reportFormat: ReportFormat;
  clientId: string;
  managerId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  description: string;
  client: { name: string };
  manager: { displayName: string } | null;
}): AdminProject {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    reportFormat: row.reportFormat,
    clientId: row.clientId,
    clientName: row.client.name,
    managerId: row.managerId,
    managerName: row.manager?.displayName ?? null,
    startDate: toIsoDay(row.startDate),
    endDate: toIsoDay(row.endDate),
    description: row.description,
  };
}

function calendarDate(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00.000Z`);
}

async function requireActiveManager(managerId: string): Promise<void> {
  const manager = await prisma.user.findFirst({ where: { id: managerId, isActive: true } });
  if (!manager) {
    throw AppError.badRequest('Manager not found or inactive', [
      { field: 'managerId', message: 'Manager not found or inactive' },
    ]);
  }
}

export async function listProjects(): Promise<AdminProject[]> {
  const rows = await prisma.project.findMany({
    where: { isActive: undefined } as unknown as Prisma.ProjectWhereInput,
    select: projectSelect,
    orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
  });
  return rows.map(toDto);
}

export async function createProject(input: CreateProjectBody): Promise<AdminProject> {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, isActive: true } });
  if (!client) {
    throw AppError.badRequest('Client not found or inactive', [
      { field: 'clientId', message: 'Client not found or inactive' },
    ]);
  }
  await requireActiveManager(input.managerId);

  const created = await prisma.project.create({
    data: {
      name: input.name,
      clientId: input.clientId,
      managerId: input.managerId,
      startDate: calendarDate(input.startDate),
      endDate: calendarDate(input.endDate),
      description: input.description,
    },
    select: projectSelect,
  });
  return toDto(created);
}

export async function updateProject(id: string, input: UpdateProjectBody): Promise<AdminProject> {
  if (input.managerId) {
    await requireActiveManager(input.managerId);
  }

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.reportFormat !== undefined && { reportFormat: input.reportFormat }),
        ...(input.managerId !== undefined && { managerId: input.managerId }),
        ...(input.startDate !== undefined && {
          startDate: input.startDate ? calendarDate(input.startDate) : null,
        }),
        ...(input.endDate !== undefined && {
          endDate: input.endDate ? calendarDate(input.endDate) : null,
        }),
        ...(input.description !== undefined && { description: input.description }),
      },
      select: projectSelect,
    });
    return toDto(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw AppError.notFound('Project not found');
    }
    throw error;
  }
}
