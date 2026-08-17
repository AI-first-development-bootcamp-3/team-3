import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const changePasswordBodySchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
