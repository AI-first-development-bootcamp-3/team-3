import { z } from 'zod';
import { ReportFormat } from '../generated/prisma/enums.js';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), 'Date must be a real calendar day');

export const createProjectBodySchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    clientId: z.string().uuid(),
    managerId: z.string().uuid(),
    startDate: isoDate,
    endDate: isoDate,
    description: z.string().trim().max(2000).optional().default(''),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;

export const updateProjectBodySchema = z
  .object({
    name: z.string().min(1, 'Name is required').optional(),
    isActive: z.boolean().optional(),
    reportFormat: z.enum(ReportFormat).optional(),
    managerId: z.string().uuid().nullable().optional(),
    startDate: isoDate.nullable().optional(),
    endDate: isoDate.nullable().optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) => {
      if (typeof value.startDate !== 'string' || typeof value.endDate !== 'string') return true;
      return value.endDate >= value.startDate;
    },
    { message: 'endDate must be on or after startDate', path: ['endDate'] },
  );

export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
