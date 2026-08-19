import { z } from 'zod';

/** Employee-writable types. HOLIDAY is system-owned (SCRUM-308). */
export const EMPLOYEE_ABSENCE_TYPES = ['VACATION', 'SICK', 'RESERVE_DUTY', 'OTHER'] as const;

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const absenceWriteObject = z
  .object({
    type: z.enum(EMPLOYEE_ABSENCE_TYPES),
    startDate: calendarDateSchema,
    endDate: calendarDateSchema.optional(),
    halfDay: z.boolean().optional(),
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
    if (!body.halfDay) return;
    if (body.type !== 'VACATION') {
      ctx.addIssue({
        code: 'custom',
        path: ['halfDay'],
        message: 'Half-day is only allowed for vacation',
      });
    }
    if (endDate !== body.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['halfDay'],
        message: 'Half-day absences must be a single date',
      });
    }
  });

export const createAbsenceBodySchema = absenceWriteObject.transform((body) => ({
  type: body.type,
  startDate: body.startDate,
  endDate: body.endDate ?? body.startDate,
  halfDay: body.halfDay ?? false,
  attachmentIds: body.attachmentIds ?? [],
}));

export type CreateAbsenceBody = z.infer<typeof createAbsenceBodySchema>;

/** Omitted `attachmentIds` means leave current links; `[]` clears them. */
export const updateAbsenceBodySchema = absenceWriteObject.transform((body) => ({
  type: body.type,
  startDate: body.startDate,
  endDate: body.endDate ?? body.startDate,
  halfDay: body.halfDay,
  attachmentIds: body.attachmentIds,
}));

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
