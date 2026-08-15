import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../types/errors.js';

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  mustChangePassword: boolean;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

function toPublicUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  mustChangePassword: boolean;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * Verifies email + password against the stored hash and issues a JWT.
 * Deactivated accounts are rejected the same as a wrong password — an admin
 * marking a user inactive must actually lock them out, not just hide them
 * from lists.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '8h' });

  return { token, user: toPublicUser(user) };
}

/**
 * Sets a new password for the caller and clears mustChangePassword. No old-
 * password check: this endpoint is reached with a valid session token, and
 * its primary caller is a brand-new user who was handed a temporary
 * password out-of-band and has nothing else to prove they know yet.
 */
export async function changeOwnPassword(userId: string, newPassword: string): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });

  return toPublicUser(user);
}
