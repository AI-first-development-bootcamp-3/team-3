import { z } from 'zod';
import { WorkLocation } from '../generated/prisma/enums.js';

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');

export const createTimeReportBodySchema = z
  .object({
    date: calendarDateSchema,
    workLocation: z.enum(WorkLocation),
    startTime: hhmmSchema,
    endTime: hhmmSchema,
    clientId: z.string().uuid(),
    projectId: z.string().uuid(),
    taskId: z.string().uuid(),
    description: z.string().trim().min(1, 'Description is required').max(2000),
  })
  .refine((data) => data.endTime >= data.startTime, {
    message: 'End time must not be before start time',
    path: ['endTime'],
  });

export type CreateTimeReportBody = z.infer<typeof createTimeReportBodySchema>;
