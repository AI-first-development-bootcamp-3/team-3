import type { Role } from '../generated/prisma/enums.js';

/**
 * Shape of the JWT payload issued at login (owned by the Auth epic) and
 * trusted here after signature verification.
 */
export interface JwtPayload {
  sub: string;
  role: Role;
}
