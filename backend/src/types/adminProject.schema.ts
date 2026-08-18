import { z } from 'zod';
import { ReportFormat } from '../generated/prisma/enums';

export const createProjectBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  clientId: z.string().uuid(),
});

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;

export const updateProjectBodySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  isActive: z.boolean().optional(),
  reportFormat: z.enum(ReportFormat).optional(),
});

export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
