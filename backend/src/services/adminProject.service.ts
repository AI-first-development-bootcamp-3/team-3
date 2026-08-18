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
}

const projectSelect = {
  id: true,
  name: true,
  isActive: true,
  reportFormat: true,
  clientId: true,
  client: { select: { name: true } },
} as const;

function toDto(row: {
  id: string;
  name: string;
  isActive: boolean;
  reportFormat: ReportFormat;
  clientId: string;
  client: { name: string };
}): AdminProject {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    reportFormat: row.reportFormat,
    clientId: row.clientId,
    clientName: row.client.name,
  };
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

  const created = await prisma.project.create({
    data: { name: input.name, clientId: input.clientId },
    select: projectSelect,
  });
  return toDto(created);
}

export async function updateProject(id: string, input: UpdateProjectBody): Promise<AdminProject> {
  try {
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.reportFormat !== undefined && { reportFormat: input.reportFormat }),
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
