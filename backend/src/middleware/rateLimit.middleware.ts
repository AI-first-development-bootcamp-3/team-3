import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from '../config/env.js';
import { RateLimitStore } from '../services/rateLimitStore.js';
import { AppError } from '../types/errors.js';

const WINDOW_MS = env.RATE_LIMIT_WINDOW_SECONDS * 1000;

/**
 * Shared across every route this middleware is applied to, so an attacker
 * throttled on one credential-handling route stays throttled on the other
 * via the address leg. See openspec/changes/login-rate-limiting/design.md.
 */
export const rateLimitStore = new RateLimitStore(WINDOW_MS);

// A key with no further activity would otherwise sit in memory until the
// process restarts or the entry cap forces an eviction. Sweeping once a
// window is cheap insurance on top of that cap - see design.md, Risks.
const sweepTimer = setInterval(() => rateLimitStore.sweep(), WINDOW_MS);
sweepTimer.unref();

function normaliseAccountKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export interface RateLimitOptions {
  /**
   * Extracts the value to throttle per-account on this route, e.g. the
   * submitted email on `/login`. Omit entirely for a route with no
   * pre-verification identity worth keying on - see the comment at the
   * `/me/password` wiring in auth.routes.ts for why that route throttles
   * by address only.
   */
  getAccountKey?: (req: Request) => string | undefined;
}

/**
 * Rejects with 429 before the handler runs if either the submitted
 * account or the caller's address has exceeded its failed-attempt
 * threshold within the window. Otherwise lets the request through and,
 * once the handler has responded, records a failure on 401 or clears the
 * account's failures on 200. A 400 (malformed request) is never seen here -
 * `validate` rejects it earlier in the chain - so it never counts.
 */
export function rateLimit({ getAccountKey }: RateLimitOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawAccountKey = getAccountKey?.(req);
    const accountKey = rawAccountKey ? `account:${normaliseAccountKey(rawAccountKey)}` : undefined;
    const addressKey = `address:${req.ip}`;

    const addressResult = rateLimitStore.check(addressKey, env.RATE_LIMIT_IP_MAX_ATTEMPTS);
    const accountResult = accountKey
      ? rateLimitStore.check(accountKey, env.RATE_LIMIT_EMAIL_MAX_ATTEMPTS)
      : { allowed: true, retryAfterSeconds: 0 };

    if (!accountResult.allowed || !addressResult.allowed) {
      const retryAfterSeconds = Math.max(accountResult.retryAfterSeconds, addressResult.retryAfterSeconds);
      next(AppError.tooManyRequests(retryAfterSeconds));
      return;
    }

    res.on('finish', () => {
      if (res.statusCode === 401) {
        if (accountKey) {
          rateLimitStore.recordFailure(accountKey);
        }
        rateLimitStore.recordFailure(addressKey);
      } else if (res.statusCode === 200 && accountKey) {
        rateLimitStore.clear(accountKey);
      }
    });

    next();
  };
}
