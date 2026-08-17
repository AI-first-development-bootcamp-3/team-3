import { z } from 'zod'

export const adminClientFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactDetails: z.string(),
})

export type AdminClientFormValues = z.infer<typeof adminClientFormSchema>
