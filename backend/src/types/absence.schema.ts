import { z } from 'zod';
import { AbsenceType } from '../generated/prisma/enums.js';

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const createAbsenceBodySchema = z
  .object({
    type: z.enum(AbsenceType),
    startDate: calendarDateSchema,
    // Omitted entirely for a single-day absence - the service defaults it to startDate.
    endDate: calendarDateSchema.optional(),
    halfDay: z.boolean().optional().default(false),
  })
  .refine((data) => data.endDate === undefined || data.endDate >= data.startDate, {
    message: 'End date must not be before start date',
    path: ['endDate'],
  });

export type CreateAbsenceBody = z.infer<typeof createAbsenceBodySchema>;