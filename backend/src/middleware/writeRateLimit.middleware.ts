import type { Request } from 'express';
import {
  MemoryStore,
  ipKeyGenerator,
  rateLimit,
  type RateLimitInfo,
} from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../types/errors.js';

/** Exported so tests can clear the counters between cases. */
export const reportWriteRateLimitStore = new MemoryStore();

function retryAfterSeconds(resetTime: Date | undefined): number {
  if (!resetTime) {
    return env.RATE_LIMIT_WINDOW_SECONDS;
  }
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}

/**
 * Caps how many report writes one caller can drive within the shared window.
 * Unlike the credential limiter next door it counts *every* request, not only
 * the failures: what needs bounding here is a valid token replaying a
 * multi-row transactional insert, not password guessing.
 *
 * Keyed by the authenticated subject, so it has to sit after `authenticate` —
 * an address key would throttle a whole office behind one NAT address
 * collectively. The address fallback only ever applies if this is wired onto a
 * route with no identity.
 *
 * Built on express-rate-limit rather than our own `rateLimit` middleware for
 * two reasons: that one is failure-counting by design, and CodeQL's
 * js/missing-rate-limiting only recognises the known libraries, so a
 * hand-rolled limiter leaves the route flagged either way.
 */
export const writeRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1000,
  limit: env.RATE_LIMIT_WRITE_MAX_REQUESTS,
  store: reportWriteRateLimitStore,
  // Off so a throttled write answers with exactly the body and Retry-After
  // header the credential routes already produce.
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.sub ?? ipKeyGenerator(req.ip ?? ''),
  handler: (req, _res, next) => {
    // The library attaches this to the request but ships no module
    // augmentation for it, so Express's own type doesn't know about it.
    const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
    next(AppError.tooManyRequests(retryAfterSeconds(info?.resetTime)));
  },
});

/** Exported so tests can clear the counters between cases. */
export const reportReadRateLimitStore = new MemoryStore();

/** Same shape as writeRateLimit — satisfies CodeQL on authenticated GET routes. */
export const readRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1000,
  limit: env.RATE_LIMIT_READ_MAX_REQUESTS,
  store: reportReadRateLimitStore,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.sub ?? ipKeyGenerator(req.ip ?? ''),
  handler: (req, _res, next) => {
    const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
    next(AppError.tooManyRequests(retryAfterSeconds(info?.resetTime)));
  },
});
