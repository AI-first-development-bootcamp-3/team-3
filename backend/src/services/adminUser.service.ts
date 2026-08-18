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
 * Admin management needs inactive users in the assign pool and user list,
 * unlike normal app queries — same soft-delete opt-out as listClients.
 */
export async function listUsers(): Promise<CreatedUser[]> {
  return prisma.user.findMany({
    where: { isActive: undefined } as unknown as Prisma.UserWhereInput,
    select: { id: true, email: true, displayName: true, role: true, isActive: true, mustChangePassword: true },
    orderBy: { displayName: 'asc' },
  });
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

export interface ResetPasswordResult {
  user: CreatedUser;
  /** Plaintext, returned once - same one-time-reveal contract as CreateUserResult.temporaryPassword. */
  temporaryPassword: string;
}

/**
 * Issues a new generated temporary password for an existing user and forces
 * a change on next login, same as account creation. Admins cannot choose the
 * new password (see SCRUM-83 design) - always generated.
 */
export async function resetUserPassword(id: string): Promise<ResetPasswordResult> {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const user = await updateUserOrNotFound(id, { passwordHash, mustChangePassword: true });

  return { user, temporaryPassword };
}

/** Changes a user's role. No self-demotion or last-admin restriction (see SCRUM-83 design - YAGNI, not required by spec). */
export async function changeUserRole(id: string, role: Role): Promise<CreatedUser> {
  return updateUserOrNotFound(id, { role });
}

/**
 * Deactivates or reactivates a user. No self-deactivation or last-admin
 * restriction (see design.md D6 - consistent with changeUserRole above).
 * `update` is not intercepted by the soft-delete extension, so this reaches
 * and reactivates an already-deactivated row with no opt-out needed.
 */
export async function setUserActive(id: string, isActive: boolean): Promise<CreatedUser> {
  return updateUserOrNotFound(id, { isActive });
}

async function updateUserOrNotFound(id: string, data: Prisma.UserUpdateInput): Promise<CreatedUser> {
  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, displayName: true, role: true, isActive: true, mustChangePassword: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw AppError.notFound('User not found');
    }
    throw error;
  }
}
