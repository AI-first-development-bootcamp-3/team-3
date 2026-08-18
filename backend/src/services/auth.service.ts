import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma, type Prisma } from '../config/prisma.js';
import { AppError } from '../types/errors.js';
import type { JwtPayload } from '../types/auth.js';

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  mustChangePassword: boolean;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
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
 * Unknown email and wrong password share a generic 401. An inactive account
 * with a correct password is 403 ACCOUNT_INACTIVE so the user can contact admin.
 */
export async function login(email: string, password: string, rememberMe = false): Promise<LoginResult> {
  const user = await prisma.user.findFirst({
    where: { email, isActive: undefined } as unknown as Prisma.UserWhereInput,
  });

  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw new AppError(
      403,
      'ACCOUNT_INACTIVE',
      'This account is inactive. Contact an administrator.',
    );
  }

  const expiresInSeconds = rememberMe ? env.JWT_REMEMBER_ME_EXPIRES_IN_SECONDS : env.JWT_EXPIRES_IN_SECONDS;
  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: expiresInSeconds });

  // jwt.sign already stamps `iat` unless `noTimestamp` is set, but the
  // revocation gate in authenticate() now depends on that claim being
  // present, so it must be part of the contract rather than a library
  // default a future option flag could silently drop (design.md D6).
  const { iat } = jwt.decode(token) as JwtPayload;
  if (iat === undefined) {
    throw AppError.internal('Signed token is missing iat');
  }

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  // Deliberately does NOT stamp sessionsValidFrom here - logging in must
  // never end the account's other sessions (design.md D6).
  return { token, expiresAt, user: toPublicUser(user) };
}

/**
 * Ends every session for this account: moves sessionsValidFrom forward so
 * that any token issued before this moment - including the one just used to
 * call this endpoint - is refused by authenticate() from now on. Global by
 * design (design.md D1): there is no per-token record to revoke selectively.
 */
export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionsValidFrom: new Date() },
  });
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
