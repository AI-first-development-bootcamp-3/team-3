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

/**
 * One project row of a day. Unlike the single-report body the description is
 * optional: the דיווח ידני screen offers it as an extra line, so demanding it
 * would block a flow the design allows.
 */
const timeReportRowSchema = z
  .object({
    workLocation: z.enum(WorkLocation),
    startTime: hhmmSchema,
    endTime: hhmmSchema,
    clientId: z.string().uuid(),
    projectId: z.string().uuid(),
    taskId: z.string().uuid(),
    description: z.string().trim().max(2000).default(''),
  })
  .refine((data) => data.endTime >= data.startTime, {
    message: 'End time must not be before start time',
    path: ['endTime'],
  });

export const MAX_ROWS_PER_DAY = 20;

export const createTimeReportBatchBodySchema = z.object({
  date: calendarDateSchema,
  rows: z
    .array(timeReportRowSchema)
    .min(1, 'At least one project row is required')
    .max(MAX_ROWS_PER_DAY, `A day cannot hold more than ${MAX_ROWS_PER_DAY} rows`),
});

export type CreateTimeReportBatchBody = z.infer<typeof createTimeReportBatchBodySchema>;
export type TimeReportRow = z.infer<typeof timeReportRowSchema>;
