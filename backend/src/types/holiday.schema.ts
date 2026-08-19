import { z } from 'zod';

export const listHolidaysQuerySchema = z.object({
  year: z.coerce.number().int().min(2000, 'Year out of range').max(2100, 'Year out of range'),
});

export type ListHolidaysQuery = z.infer<typeof listHolidaysQuerySchema>;
