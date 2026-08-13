import { z } from 'zod';

export const echoBodySchema = z.object({
  name: z.string(),
  age: z.number(),
});

export type EchoBody = z.infer<typeof echoBodySchema>;
