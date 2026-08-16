import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import type { Role } from '../generated/prisma/enums.js';
import { AppError } from '../types/errors.js';
import { logger } from '../config/logger.js';
import { emailSender } from './emailSender.js';

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
   * retrievable again. Also emailed automatically (SCRUM-208); kept in the
   * response too as a fallback if that email fails to send.
   */
  temporaryPassword: string;
}

/** URL-safe, no ambiguous-looking characters excluded - a human may need to type this. */
function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString('base64url');
}

/**
 * A flaky mail provider must not undo an otherwise-successful account
 * creation - the temporary password is still returned in the API response
 * as a fallback delivery channel either way, so a logged failure here is
 * recoverable, not silent data loss.
 */
async function sendCredentialEmail(to: string, temporaryPassword: string): Promise<void> {
  try {
    await emailSender.send({
      to,
      subject: 'Your Abra Timesheet account',
      text: `An account was created for you.\n\nEmail: ${to}\nTemporary password: ${temporaryPassword}\n\nYou will be asked to set a new password the first time you log in.`,
    });
  } catch (error) {
    logger.warn({ err: error, to }, 'Failed to send credential email; user was still created');
  }
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

    await sendCredentialEmail(user.email, temporaryPassword);

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
