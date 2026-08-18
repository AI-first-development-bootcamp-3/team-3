import { z } from 'zod'

export const changePasswordFormSchema = z
  .object({
    newPassword: z.string().min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים'),
    confirmPassword: z.string().min(1, 'יש לאמת את הסיסמה החדשה'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'הסיסמאות אינן תואמות',
    path: ['confirmPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>
