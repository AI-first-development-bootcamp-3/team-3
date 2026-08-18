import { z } from 'zod';
import { AbsenceType } from '../generated/prisma/enums.js';

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const createAbsenceBodySchema = z
  .object({
    type: z.enum(AbsenceType),
    startDate: calendarDateSchema,
    endDate: calendarDateSchema.optional(),
    attachmentIds: z.array(z.string().uuid()).optional(),
  })
  .superRefine((body, ctx) => {
    const endDate = body.endDate ?? body.startDate;
    if (endDate < body.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must not be before start date',
      });
    }
  })
  .transform((body) => ({
    type: body.type,
    startDate: body.startDate,
    endDate: body.endDate ?? body.startDate,
    attachmentIds: body.attachmentIds ?? [],
  }));

export type CreateAbsenceBody = z.infer<typeof createAbsenceBodySchema>;

export const updateAbsenceBodySchema = createAbsenceBodySchema;

export type UpdateAbsenceBody = z.infer<typeof updateAbsenceBodySchema>;

export const listAbsencesQuerySchema = z.object({
  month: z.coerce.number().int().min(1, 'Month must be 1–12').max(12, 'Month must be 1–12'),
  year: z.coerce.number().int().min(2000, 'Year out of range').max(2100, 'Year out of range'),
});

export type ListAbsencesQuery = z.infer<typeof listAbsencesQuerySchema>;

export const absenceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type AbsenceIdParam = z.infer<typeof absenceIdParamSchema>;
