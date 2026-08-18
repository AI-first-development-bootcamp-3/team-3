import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../types/errors.js';
import type { TaskStatus } from '../generated/prisma/enums.js';
import type { CreateTaskBody, UpdateTaskBody } from '../types/adminTask.schema.js';

export interface AdminTask {
  id: string;
  name: string;
  status: TaskStatus;
  isActive: boolean;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
}

const taskSelect = {
  id: true,
  name: true,
  status: true,
  isActive: true,
  projectId: true,
  project: {
    select: {
      name: true,
      clientId: true,
      client: { select: { name: true } },
    },
  },
} as const;

function toDto(row: {
  id: string;
  name: string;
  status: TaskStatus;
  isActive: boolean;
  projectId: string;
  project: { name: string; clientId: string; client: { name: string } };
}): AdminTask {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    isActive: row.isActive,
    projectId: row.projectId,
    projectName: row.project.name,
    clientId: row.project.clientId,
    clientName: row.project.client.name,
  };
}

export async function listTasks(): Promise<AdminTask[]> {
  const rows = await prisma.task.findMany({
    where: { isActive: undefined } as unknown as Prisma.TaskWhereInput,
    select: taskSelect,
    orderBy: [{ project: { client: { name: 'asc' } } }, { project: { name: 'asc' } }, { name: 'asc' }],
  });
  return rows.map(toDto);
}

export async function createTask(input: CreateTaskBody): Promise<AdminTask> {
  const project = await prisma.project.findFirst({ where: { id: input.projectId, isActive: true } });
  if (!project) {
    throw AppError.badRequest('Project not found or inactive', [
      { field: 'projectId', message: 'Project not found or inactive' },
    ]);
  }

  const created = await prisma.task.create({
    data: { name: input.name, projectId: input.projectId },
    select: taskSelect,
  });
  return toDto(created);
}

export async function updateTask(id: string, input: UpdateTaskBody): Promise<AdminTask> {
  try {
    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: taskSelect,
    });
    return toDto(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw AppError.notFound('Task not found');
    }
    throw error;
  }
}
