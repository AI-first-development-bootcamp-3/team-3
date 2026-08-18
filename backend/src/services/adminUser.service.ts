import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import type { Role } from '../generated/prisma/enums.js';
import { AppError } from '../types/errors.js';

export interface CreateUserInput {
  email: string;
  displayName: string;
  role: Role;
  temporaryPassword?: string | undefined;
}

export interface CreatedUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface CreateUserResult {
  user: CreatedUser;
  /**
   * Plaintext, returned once at creation time only - never stored, never
   * retrievable again. The admin relays this to the new user.
   */
  temporaryPassword: string;
}

/** URL-safe, no ambiguous-looking characters excluded - a human may need to type this. */
function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString('base64url');
}

/**
 * Creates a user with a temporary password the caller must change before
 * doing anything else (SCRUM-209's mustChangePassword defaults to true).
 * Duplicate email is a 409, not a 400 - it's a conflict with existing state,
 * not a malformed request. Relies on the DB's unique constraint rather than
 * a separate existence check, so two concurrent requests for the same email
 * can't both pass a check-then-create race.
 */
export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const temporaryPassword = input.temporaryPassword ?? generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        passwordHash,
        mustChangePassword: true,
      },
      select: { id: true, email: true, displayName: true, role: true, isActive: true, mustChangePassword: true },
    });

    return { user, temporaryPassword };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('A user with this email already exists');
    }
    throw error;
  }
}
