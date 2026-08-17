import { z } from 'zod';
import { Role } from '../generated/prisma/enums.js';

export const createUserBodySchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(Role),
  // Optional: an admin may set a specific temporary password, or leave it
  // unset for the service to generate one.
  temporaryPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;

export const changeRoleBodySchema = z.object({
  role: z.enum(Role),
});

export type ChangeRoleBody = z.infer<typeof changeRoleBodySchema>;

export const setUserActiveBodySchema = z.object({
  isActive: z.boolean(),
});

export type SetUserActiveBody = z.infer<typeof setUserActiveBodySchema>;
