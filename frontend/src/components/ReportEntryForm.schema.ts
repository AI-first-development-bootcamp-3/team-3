import { z } from 'zod'

const hhmm = z.string().min(1, 'יש לבחור שעה').regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'שעה בפורמט HH:mm')

export const reportEntryFormSchema = z
  .object({
    date: z.string().min(1, 'יש לבחור תאריך').regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך בפורמט YYYY-MM-DD'),
    workLocation: z
      .union([z.literal(''), z.enum(['OFFICE', 'CLIENT', 'HOME'])])
      .refine((value) => value !== '', { message: 'יש לבחור מיקום' }),
    startTime: hhmm,
    endTime: hhmm,
    clientId: z.string().min(1, 'יש לבחור לקוח'),
    projectId: z.string().min(1, 'יש לבחור פרויקט'),
    taskId: z.string().min(1, 'יש לבחור משימה'),
    description: z.string().trim().min(1, 'יש להזין פירוט').max(2000),
  })
  .refine((data) => data.endTime >= data.startTime, {
    message: 'שעת היציאה לא יכולה להיות לפני שעת הכניסה',
    path: ['endTime'],
  })

export type ReportEntryFormValues = z.input<typeof reportEntryFormSchema>

