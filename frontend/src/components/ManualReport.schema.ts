import { z } from 'zod'

const hhmm = z.string().min(1, 'יש לבחור שעה').regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'שעה בפורמט HH:mm')

const projectRowSchema = z
  .object({
    clientId: z.string().min(1, 'יש לבחור פרויקט'),
    projectId: z.string().min(1, 'יש לבחור פרויקט'),
    taskId: z.string().min(1, 'יש לבחור משימה'),
    workLocation: z
      .union([z.literal(''), z.enum(['OFFICE', 'CLIENT', 'HOME'])])
      .refine((value) => value !== '', { message: 'יש לבחור מיקום' }),
    startTime: hhmm,
    endTime: hhmm,
    description: z.string().trim().max(2000, 'הפירוט ארוך מדי'),
  })
  .refine((row) => row.endTime >= row.startTime, {
    message: 'שעת הסיום לא יכולה להיות לפני שעת ההתחלה',
    path: ['endTime'],
  })

export const manualReportSchema = z
  .object({
    date: z.string().min(1, 'יש לבחור תאריך').regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך בפורמט YYYY-MM-DD'),
    dayStart: hhmm,
    dayEnd: hhmm,
    rows: z.array(projectRowSchema).min(1, 'יש להוסיף לפחות פרויקט אחד'),
  })
  .refine((day) => day.dayEnd >= day.dayStart, {
    message: 'שעת היציאה לא יכולה להיות לפני שעת הכניסה',
    path: ['dayEnd'],
  })
  .superRefine((day, ctx) => {
    // A row outside the attendance window is a typo, and it is far cheaper to
    // catch here than to explain a wrong month total later.
    day.rows.forEach((row, index) => {
      if (row.startTime && row.startTime < day.dayStart) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', index, 'startTime'],
          message: 'השעה מוקדמת משעת הכניסה',
        })
      }
      if (row.endTime && day.dayEnd && row.endTime > day.dayEnd) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', index, 'endTime'],
          message: 'השעה מאוחרת משעת היציאה',
        })
      }
    })
  })

export type ManualReportValues = z.input<typeof manualReportSchema>
export type ProjectRowValues = ManualReportValues['rows'][number]
