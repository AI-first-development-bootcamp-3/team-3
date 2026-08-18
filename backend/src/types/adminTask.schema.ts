import { z } from 'zod';
import { TaskStatus } from '../generated/prisma/enums.js';

export const createTaskBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  projectId: z.string().uuid(),
});

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;

export const taskIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;

export const updateTaskBodySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  status: z.enum(TaskStatus).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
