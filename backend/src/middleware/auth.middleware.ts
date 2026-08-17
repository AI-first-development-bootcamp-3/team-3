import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma, type Prisma } from '../config/prisma.js';
import { AppError } from '../types/errors.js';
import type { JwtPayload } from '../types/auth.js';

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return undefined;

  return token;
}

/**
 * Verifies the bearer token's signature and expiry, then re-checks the
 * account the token identifies against storage: the account must still
 * exist and be active. Rejects everything else with 401, distinguishing
 * expiry and a deactivated account (so clients know to re-authenticate or
 * that the account was revoked) from every other failure without
 * disclosing which one occurred. On success, attaches the caller's identity
 * to the request — `sub` from the verified token, `role` from the stored
 * row rather than the token's claim, so a role change takes effect on the
 * caller's very next request.
 */
export const authenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = extractBearerToken(req);
  if (!token) {
    next(AppError.unauthorized('Authentication required'));
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'TOKEN_EXPIRED', 'Token has expired'));
      return;
    }
    next(AppError.unauthorized('Invalid authentication token'));
    return;
  }

  // The soft-delete extension (config/prisma.ts) treats an explicit `isActive`
  // key in `where` — even `undefined` — as an opt-out of its default
  // `isActive: true` filter, so a deactivated row is returned instead of
  // hidden. Prisma's generated `UserWhereInput` doesn't itself admit
  // `isActive: undefined` under `exactOptionalPropertyTypes`, so the cast
  // below is required purely to satisfy that; it changes no runtime behavior.
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, isActive: undefined } as unknown as Prisma.UserWhereInput,
  });

  if (!user) {
    next(AppError.unauthorized('Invalid authentication token'));
    return;
  }

  if (!user.isActive) {
    next(new AppError(401, 'ACCOUNT_DEACTIVATED', 'Account is no longer active'));
    return;
  }

  // A token that cannot state when it was issued cannot be proven newer
  // than a logout, so it is treated as failing the check rather than
  // passing it (design.md D3). `JwtPayload` declares `iat` as required, but
  // that's a compile-time promise about tokens this service issues, not a
  // runtime guarantee about whatever was decoded above - only jwt.sign()
  // reliably stamps it.
  if (typeof payload.iat !== 'number') {
    next(AppError.unauthorized('Invalid authentication token'));
    return;
  }

  // sessionsValidFrom is a millisecond DateTime; `iat` is whole seconds -
  // the JWT spec gives no finer resolution. Flooring the boundary to its
  // second, rather than ceiling or comparing raw milliseconds, is
  // deliberate: it means a token minted in the very same wall-clock second
  // as a logout survives the check. The alternative - rejecting that
  // token - would also reject a legitimate login that happens a fraction of
  // a second *after* the logout, since both carry the same `iat` second and
  // are indistinguishable from one another. That would make an immediate
  // re-login after logout instantly refused, a reproducible user-visible
  // bug traded for closing a sub-second window that an attacker cannot hit
  // without already controlling the timing of the victim's logout (see
  // design.md D2).
  const boundarySeconds = Math.floor(user.sessionsValidFrom.getTime() / 1000);
  if (payload.iat < boundarySeconds) {
    next(new AppError(401, 'SESSION_REVOKED', 'Session has ended'));
    return;
  }

  req.user = { sub: payload.sub, role: user.role };
  next();
};

/**
 * Restricts a route to a given role. Must run after `authenticate` — an
 * unauthenticated caller is rejected 401 by that middleware before this one
 * ever runs, so a missing `req.user` here means the guard was misapplied.
 */
export function requireRole(role: JwtPayload['role']): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }

    if (req.user.role !== role) {
      next(AppError.forbidden('Not permitted'));
      return;
    }

    next();
  };
}
