import { z } from 'zod';
import { WorkLocation } from '../generated/prisma/enums.js';
import { isOneDecimalHours } from '../lib/attendanceWindow.js';

export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');

const hoursSchema = z.coerce
  .number()
  .refine((value) => value >= 0 && value <= 24 && isOneDecimalHours(value), {
    message: 'Hours must be between 0 and 24 with at most one decimal place',
  });

/**
 * Which of `hours` / `rowStartTime`+`rowEndTime` a row must carry depends on
 * its project's `reportFormat`, which lives in the database — so these schemas
 * accept either shape and the service decides. Everything format-independent
 * (ids, `HH:mm`, work location, one-decimal hours) is still settled here. See
 * openspec/changes/report-format-aware-entry/design.md, D2.
 */
const formatDependentFields = {
  hours: hoursSchema.optional(),
  rowStartTime: hhmmSchema.optional(),
  rowEndTime: hhmmSchema.optional(),
};

export const createTimeReportBodySchema = z.object({
  date: calendarDateSchema,
  workLocation: z.enum(WorkLocation),
  startTime: hhmmSchema,
  endTime: hhmmSchema,
  ...formatDependentFields,
  clientId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  description: z.string().trim().max(2000).default(''),
});

export type CreateTimeReportBody = z.infer<typeof createTimeReportBodySchema>;

const timeReportRowSchema = z.object({
  workLocation: z.enum(WorkLocation),
  clientId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  ...formatDependentFields,
  description: z.string().trim().max(2000).default(''),
});

export const MAX_ROWS_PER_DAY = 20;

export const createTimeReportBatchBodySchema = z.object({
  date: calendarDateSchema,
  startTime: hhmmSchema,
  endTime: hhmmSchema,
  rows: z
    .array(timeReportRowSchema)
    .min(1, 'At least one project row is required')
    .max(MAX_ROWS_PER_DAY, `A day cannot hold more than ${MAX_ROWS_PER_DAY} rows`),
});

export type CreateTimeReportBatchBody = z.infer<typeof createTimeReportBatchBodySchema>;
export type TimeReportRow = z.infer<typeof timeReportRowSchema>;

export const listTimeReportsQuerySchema = z.object({
  month: z.coerce.number().int().min(1, 'Month must be 1–12').max(12, 'Month must be 1–12'),
  year: z.coerce.number().int().min(2000, 'Year out of range').max(2100, 'Year out of range'),
});

export type ListTimeReportsQuery = z.infer<typeof listTimeReportsQuerySchema>;

export const deleteTimeReportsQuerySchema = z.object({
  date: calendarDateSchema,
});

export type DeleteTimeReportsQuery = z.infer<typeof deleteTimeReportsQuerySchema>;
