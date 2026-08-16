import { z } from 'zod'

export const loginFormSchema = z.object({
  email: z.string().min(1, 'יש להזין אימייל').email('יש להזין כתובת אימייל תקינה'),
  password: z.string().min(1, 'יש להזין סיסמה'),
  rememberMe: z.boolean(),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>
