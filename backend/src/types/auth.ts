import type { Role } from '../generated/prisma/enums.js';

/**
 * Shape of the JWT payload issued at login (owned by the Auth epic) and
 * trusted here after signature verification.
 */
export interface JwtPayload {
  sub: string;
  role: Role;
}

/**
 * Shape of `req.user`, attached by `authenticate` after the token is
 * verified and the account is re-checked against storage. `sub` comes from
 * the verified token; `role` comes from the freshly-read user row, not the
 * token's claim — kept distinct from `JwtPayload` so the two stop being
 * accidentally interchangeable.
 */
export interface AuthenticatedUser {
  sub: string;
  role: Role;
}
