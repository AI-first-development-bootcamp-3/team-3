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
