import { z } from 'zod';

export const createAssignmentsBodySchema = z.object({
  taskId: z.string().uuid(),
  userIds: z
    .array(z.string().uuid())
    .min(1)
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate user ids'),
});

export type CreateAssignmentsBody = z.infer<typeof createAssignmentsBodySchema>;

export const deleteAssignmentQuerySchema = z.object({
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type DeleteAssignmentQuery = z.infer<typeof deleteAssignmentQuerySchema>;
