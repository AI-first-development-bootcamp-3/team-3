import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { evaluateLock, recordLoginAttempt, type LoginAttemptOutcome } from '../services/loginAttempt.service.js';
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

function outcomeForStatus(status: number): LoginAttemptOutcome | undefined {
  if (status === 401) return 'CREDENTIAL_REJECTED';
  if (status === 429) return 'THROTTLED';
  if (status === 423) return 'LOCKED';
  if (status === 200) return 'SUCCESS';
  return undefined;
}

/**
 * Rejects with 429 (throttled) or 423 (locked - see
 * openspec/changes/login-account-lockout) before the handler runs if the
 * submitted account or the caller's address has exceeded a threshold.
 * Otherwise lets the request through. Either way, once the response is
 * sent, records the outcome in the durable attempt trail (only when an
 * account key/email is available - `/me/password` has none, see its
 * wiring in auth.routes.ts) and updates the in-memory throttle counters:
 * a failure on 401, a clear on 200. A 400 (malformed request) is never
 * seen here - `validate` rejects it earlier in the chain - so it never
 * counts toward either tier.
 */
export function rateLimit({ getAccountKey }: RateLimitOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawAccountKey = getAccountKey?.(req);
    const accountKey = rawAccountKey ? `account:${normaliseAccountKey(rawAccountKey)}` : undefined;
    const addressKey = `address:${req.ip}`;

    // Attached before any check so every outcome - throttled, locked, or
    // whatever the handler itself produces - is captured, matching the
    // final status code the client actually received.
    res.on('finish', () => {
      if (res.statusCode === 401) {
        if (accountKey) {
          rateLimitStore.recordFailure(accountKey);
        }
        rateLimitStore.recordFailure(addressKey);
      } else if (res.statusCode === 200 && accountKey) {
        rateLimitStore.clear(accountKey);
      }

      // The write happens after the response is already sent, so a
      // failure here must never surface to the client - log and move on.
      if (rawAccountKey) {
        const outcome = outcomeForStatus(res.statusCode);
        if (outcome) {
          recordLoginAttempt({ email: rawAccountKey, ipAddress: req.ip ?? '', outcome }).catch((err: unknown) => {
            logger.error({ err }, 'Failed to record login attempt');
          });
        }
      }
    });

    const addressResult = rateLimitStore.check(addressKey, env.RATE_LIMIT_IP_MAX_ATTEMPTS);
    const accountResult = accountKey
      ? rateLimitStore.check(accountKey, env.RATE_LIMIT_EMAIL_MAX_ATTEMPTS)
      : { allowed: true, retryAfterSeconds: 0 };

    if (!accountResult.allowed || !addressResult.allowed) {
      const retryAfterSeconds = Math.max(accountResult.retryAfterSeconds, addressResult.retryAfterSeconds);
      next(AppError.tooManyRequests(retryAfterSeconds));
      return;
    }

    if (!rawAccountKey) {
      next();
      return;
    }

    // The lock is keyed on the submitted email - see design.md - so it only
    // applies where one exists. A read failure here fails open (treated as
    // unlocked) rather than blocking every login on a lockout-store outage.
    evaluateLock(rawAccountKey)
      .then((lockResult) => {
        if (lockResult.locked) {
          next(AppError.locked(lockResult.retryAfterSeconds));
          return;
        }
        next();
      })
      .catch((err: unknown) => {
        logger.error({ err }, 'Failed to evaluate account lock; treating as unlocked');
        next();
      });
  };
}
