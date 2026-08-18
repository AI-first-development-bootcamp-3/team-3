import { prisma } from '../config/prisma.js';
import { AppError } from '../types/errors.js';
import type { CreateAssignmentsBody } from '../types/adminAssignment.schema.js';

export interface AssignmentWorker {
  userId: string;
  displayName: string;
}

export interface AssignmentRow {
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  workers: AssignmentWorker[];
}

export async function listAssignmentRows(): Promise<AssignmentRow[]> {
  const tasks = await prisma.task.findMany({
    where: {
      status: 'OPEN',
      project: { isActive: true, client: { isActive: true } },
    },
    select: {
      id: true,
      name: true,
      projectId: true,
      project: {
        select: {
          name: true,
          clientId: true,
          client: { select: { name: true } },
        },
      },
      assignments: {
        select: {
          userId: true,
          user: { select: { displayName: true } },
        },
        orderBy: { user: { displayName: 'asc' } },
      },
    },
    orderBy: [{ project: { client: { name: 'asc' } } }, { project: { name: 'asc' } }, { name: 'asc' }],
  });

  return tasks.map((task) => ({
    taskId: task.id,
    taskName: task.name,
    projectId: task.projectId,
    projectName: task.project.name,
    clientId: task.project.clientId,
    clientName: task.project.client.name,
    workers: task.assignments.map((assignment) => ({
      userId: assignment.userId,
      displayName: assignment.user.displayName,
    })),
  }));
}

export async function addAssignments(input: CreateAssignmentsBody): Promise<AssignmentRow> {
  const task = await prisma.task.findFirst({
    where: { id: input.taskId, status: 'OPEN' },
  });
  if (!task) {
    throw AppError.notFound('Task not found');
  }

  const users = await prisma.user.findMany({
    where: { id: { in: input.userIds }, isActive: true },
    select: { id: true },
  });
  if (users.length !== input.userIds.length) {
    throw AppError.badRequest('One or more users were not found or are inactive', [
      { field: 'userIds', message: 'One or more users were not found or are inactive' },
    ]);
  }

  await prisma.taskAssignment.createMany({
    data: input.userIds.map((userId) => ({ userId, taskId: input.taskId })),
    skipDuplicates: true,
  });

  const rows = await listAssignmentRows();
  const row = rows.find((item) => item.taskId === input.taskId);
  if (!row) {
    throw AppError.notFound('Task not found');
  }
  return row;
}

export async function removeAssignment(taskId: string, userId: string): Promise<void> {
  const result = await prisma.taskAssignment.deleteMany({
    where: { taskId, userId },
  });
  if (result.count === 0) {
    throw AppError.notFound('Assignment not found');
  }
}
