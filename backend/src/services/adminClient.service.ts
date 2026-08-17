import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../types/errors.js';
import type { CreateClientBody, UpdateClientBody } from '../types/adminClient.schema.js';

export interface AdminClient {
  id: string;
  name: string;
  contactDetails: string | null;
  isActive: boolean;
}

const clientSelect = { id: true, name: true, contactDetails: true, isActive: true } as const;

/**
 * Admin management needs to see (and reactivate) deactivated clients too,
 * unlike normal app queries - explicitly opts out of the soft-delete
 * extension's default isActive: true filter (see config/prisma.ts).
 */
export async function listClients(): Promise<AdminClient[]> {
  return prisma.client.findMany({
    // exactOptionalPropertyTypes rejects `isActive: undefined` as a literal
    // value even though the soft-delete extension only checks the key's
    // presence at runtime (see config/prisma.ts) - the cast is for the type
    // checker only, the runtime behavior is exactly what's documented there.
    where: { isActive: undefined } as unknown as Prisma.ClientWhereInput,
    select: clientSelect,
    orderBy: { name: 'asc' },
  });
}

export async function createClient(input: CreateClientBody): Promise<AdminClient> {
  return prisma.client.create({
    data: {
      name: input.name,
      ...(input.contactDetails !== undefined && { contactDetails: input.contactDetails }),
    },
    select: clientSelect,
  });
}

export async function updateClient(id: string, input: UpdateClientBody): Promise<AdminClient> {
  try {
    return await prisma.client.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.contactDetails !== undefined && { contactDetails: input.contactDetails }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: clientSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw AppError.notFound('Client not found');
    }
    throw error;
  }
}
