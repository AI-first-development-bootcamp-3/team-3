import { z } from 'zod';

export const createClientBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactDetails: z.string().optional(),
});

export type CreateClientBody = z.infer<typeof createClientBodySchema>;

export const clientIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ClientIdParam = z.infer<typeof clientIdParamSchema>;

export const updateClientBodySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  contactDetails: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateClientBody = z.infer<typeof updateClientBodySchema>;
