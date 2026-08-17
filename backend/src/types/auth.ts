import type { Role } from '../generated/prisma/enums.js';

/**
 * Shape of the JWT payload issued at login (owned by the Auth epic) and
 * trusted here after signature verification. `iat` is required, not just
 * whatever `jsonwebtoken` happens to add by default: the revocation gate in
 * `authenticate` compares it against the account's `sessionsValidFrom`
 * boundary, so a token that cannot state when it was issued cannot be
 * proven newer than a logout and must be refused rather than let through
 * (see openspec/changes/user-logout/design.md, D3).
 */
export interface JwtPayload {
  sub: string;
  role: Role;
  iat: number;
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
