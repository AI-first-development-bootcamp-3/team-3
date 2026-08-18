import { z } from 'zod';

export const listMonthLocksQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export type ListMonthLocksQuery = z.infer<typeof listMonthLocksQuerySchema>;

export const lockMonthBodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export type LockMonthBody = z.infer<typeof lockMonthBodySchema>;

export const monthLockParamSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export type MonthLockParam = z.infer<typeof monthLockParamSchema>;
