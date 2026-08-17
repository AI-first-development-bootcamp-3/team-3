import { z } from 'zod'
import type { AbsenceType } from '../types'

/**
 * Half-day is only offered as a Vacation sub-option, per the Figma mock
 * (⏰ Time report files ⏰, absence frames) - Sick/Reserve/Other are always
 * full-day in this change. See openspec/changes/absences-employee-report/
 * design.md Decisions.
 */
export const ABSENCE_TYPE_ROWS: { type: AbsenceType; halfDay: boolean; label: string; emoji: string }[] = [
  { type: 'VACATION', halfDay: true, label: 'חופשה - חצי יום', emoji: '🌴' },
  { type: 'VACATION', halfDay: false, label: 'חופשה - יום מלא', emoji: '🌴' },
  { type: 'SICK', halfDay: false, label: 'מחלה', emoji: '🤒' },
  { type: 'RESERVE_DUTY', halfDay: false, label: 'מילואים', emoji: '🎖️' },
  { type: 'OTHER', halfDay: false, label: 'אחר', emoji: '📝' },
]

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך בפורמט לא תקין')

export const manualAbsenceSchema = z
  .object({
    type: z
      .union([z.literal(''), z.enum(['VACATION', 'SICK', 'RESERVE_DUTY', 'OTHER'])])
      .refine((value) => value !== '', { message: 'יש לבחור סוג היעדרות' }),
    halfDay: z.boolean(),
    isRange: z.boolean(),
    startDate: calendarDate,
    endDate: calendarDate.optional(),
  })
  .refine((values) => !values.isRange || Boolean(values.endDate), {
    message: 'יש לבחור תאריך סיום',
    path: ['endDate'],
  })
  .refine((values) => !values.endDate || values.endDate >= values.startDate, {
    message: 'תאריך הסיום לא יכול להיות לפני תאריך ההתחלה',
    path: ['endDate'],
  })

export type ManualAbsenceValues = z.input<typeof manualAbsenceSchema>