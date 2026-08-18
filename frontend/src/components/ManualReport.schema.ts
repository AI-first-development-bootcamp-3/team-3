import { z } from 'zod'

const hhmm = z.string().min(1, 'יש לבחור שעה').regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'שעה בפורמט HH:mm')

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

function minutesFromHhmm(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

/** Overnight-aware day window. Equal clocks are zero hours. */
export function attendanceWindowHours(startTime: string, endTime: string): number {
  if (!HHMM.test(startTime) || !HHMM.test(endTime)) return 0
  const start = minutesFromHhmm(startTime)
  const end = minutesFromHhmm(endTime)
  if (end === start) return 0
  const minutes = end > start ? end - start : 24 * 60 - start + end
  return minutes / 60
}

function isOneDecimalHours(value: number): boolean {
  if (!Number.isFinite(value)) return false
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9
}

const projectRowSchema = z.object({
  clientId: z.string().min(1, 'יש לבחור פרויקט'),
  projectId: z.string().min(1, 'יש לבחור פרויקט'),
  taskId: z.string().min(1, 'יש לבחור משימה'),
  workLocation: z
    .union([z.literal(''), z.enum(['OFFICE', 'CLIENT', 'HOME'])])
    .refine((value) => value !== '', { message: 'יש לבחור מיקום' }),
  hours: z.coerce.number().refine((value) => value >= 0.5 && value <= 24 && isOneDecimalHours(value), {
    message: 'יש להזין מספר בין 0.5 ל-24, עם לכל היותר ספרה אחת אחרי הנקודה',
  }),
  description: z.string().trim().max(2000, 'הפירוט ארוך מדי'),
})

export const OVERFLOW_HOURS_MESSAGE = 'סכום שעות הפרויקטים גדול מחלון הכניסה–יציאה'

export const manualReportSchema = z
  .object({
    date: z.string().min(1, 'יש לבחור תאריך').regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך בפורמט YYYY-MM-DD'),
    dayStart: hhmm,
    dayEnd: hhmm,
    rows: z.array(projectRowSchema).min(1, 'יש להוסיף לפחות פרויקט אחד'),
  })
  .superRefine((day, ctx) => {
    const windowHours = attendanceWindowHours(day.dayStart, day.dayEnd)
    const allocated = day.rows.reduce((sum, row) => sum + Number(row.hours || 0), 0)
    if (allocated > windowHours + 1e-9) {
      ctx.addIssue({
        code: 'custom',
        path: ['rows'],
        message: OVERFLOW_HOURS_MESSAGE,
      })
    }
  })

export type ManualReportValues = z.input<typeof manualReportSchema>
export type ProjectRowValues = ManualReportValues['rows'][number]
