import { z } from 'zod'

export const sampleFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })

export type SampleFormValues = z.infer<typeof sampleFormSchema>
