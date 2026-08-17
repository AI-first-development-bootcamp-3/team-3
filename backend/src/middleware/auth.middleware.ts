import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
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

  const user = await prisma.user.findUnique({ where: { id: payload.sub, isActive: undefined } });

  if (!user) {
    next(AppError.unauthorized('Invalid authentication token'));
    return;
  }

  if (!user.isActive) {
    next(new AppError(401, 'ACCOUNT_DEACTIVATED', 'Account is no longer active'));
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
