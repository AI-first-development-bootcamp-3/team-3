import { z } from 'zod'

export const createUserFormSchema = z.object({
  displayName: z.string().min(1, 'יש למלא שם'),
  email: z.string().min(1, 'יש למלא אימייל').email('יש להזין כתובת אימייל תקינה'),
  role: z.enum(['ADMIN', 'EMPLOYEE'], { message: 'יש לבחור תפקיד' }),
  temporaryPassword: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 8, {
      message: 'הסיסמה חייבת להכיל לפחות 8 תווים',
    }),
})

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>
