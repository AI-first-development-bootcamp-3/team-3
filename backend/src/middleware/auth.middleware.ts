import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
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
 * Verifies the bearer token's signature and expiry, then attaches the
 * caller's identity and role to the request. Rejects everything else with
 * 401, distinguishing expiry (so clients know to re-authenticate) from
 * every other failure without disclosing which one occurred.
 */
export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req);
  if (!token) {
    next(AppError.unauthorized('Authentication required'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'TOKEN_EXPIRED', 'Token has expired'));
      return;
    }
    next(AppError.unauthorized('Invalid authentication token'));
  }
};

/** Handler shape carrying the marker `requireRole` stamps on what it returns. */
export interface RoleGuardHandler extends RequestHandler {
  __isAdminRoleGuard?: true;
}

/**
 * Restricts a route to a given role. Must run after `authenticate` — an
 * unauthenticated caller is rejected 401 by that middleware before this one
 * ever runs, so a missing `req.user` here means the guard was misapplied.
 *
 * Stamps the returned handler with `__isAdminRoleGuard` so a route-stack
 * coverage test (see admin-api-authz) can positively identify "this route
 * has the admin guard applied" by inspecting Express's registered routes —
 * an inline arrow function otherwise has no reliable `.name` to check by.
 */
export function requireRole(role: JwtPayload['role']): RequestHandler {
  const handler: RoleGuardHandler = (req: Request, _res: Response, next: NextFunction): void => {
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

  handler.__isAdminRoleGuard = true;
  return handler;
}
