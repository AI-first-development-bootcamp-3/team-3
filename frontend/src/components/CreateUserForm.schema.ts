import { z } from 'zod'

export const createUserFormSchema = z.object({
  displayName: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.enum(['ADMIN', 'EMPLOYEE'], { message: 'Select a role' }),
  temporaryPassword: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 8, {
      message: 'Password must be at least 8 characters',
    }),
})

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>
