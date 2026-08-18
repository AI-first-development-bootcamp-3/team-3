import { z } from 'zod'

export const ABSENCE_TYPES = ['VACATION', 'SICK', 'RESERVE_DUTY', 'OTHER'] as const

export const ABSENCE_TYPE_LABELS: Record<(typeof ABSENCE_TYPES)[number], string> = {
  VACATION: 'חופשה 🏖️',
  SICK: 'מחלה 😷',
  RESERVE_DUTY: 'מילואים 🚨',
  OTHER: 'אחר',
}

const isoDate = z.string().min(1, 'יש לבחור תאריך').regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך בפורמט YYYY-MM-DD')

export const absenceReportSchema = z
  .object({
    type: z
      .union([z.literal(''), z.enum(ABSENCE_TYPES)])
      .refine((value) => value !== '', { message: 'יש לבחור סוג היעדרות' }),
    startDate: isoDate,
    endDate: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.endDate && values.endDate < values.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'תאריך הסיום לא יכול להיות לפני ההתחלה' })
    }
  })

export type AbsenceReportValues = z.infer<typeof absenceReportSchema>
