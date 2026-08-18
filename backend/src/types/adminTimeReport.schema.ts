import { z } from 'zod';
import {
  calendarDateSchema,
  createTimeReportBatchBodySchema,
  listTimeReportsQuerySchema,
} from './timeReport.schema.js';

export const adminEmployeeReportsQuerySchema = listTimeReportsQuerySchema.extend({
  userId: z.string().uuid(),
});

export type AdminEmployeeReportsQuery = z.infer<typeof adminEmployeeReportsQuerySchema>;

export const adminReportingOptionsQuerySchema = z.object({
  userId: z.string().uuid(),
});

export type AdminReportingOptionsQuery = z.infer<typeof adminReportingOptionsQuerySchema>;

export const adminReplaceEmployeeReportsBodySchema = createTimeReportBatchBodySchema.extend({
  userId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export type AdminReplaceEmployeeReportsBody = z.infer<typeof adminReplaceEmployeeReportsBodySchema>;

export const adminDeleteEmployeeReportsQuerySchema = z.object({
  userId: z.string().uuid(),
  date: calendarDateSchema,
  reason: z.string().trim().max(500).optional(),
});

export type AdminDeleteEmployeeReportsQuery = z.infer<typeof adminDeleteEmployeeReportsQuerySchema>;
