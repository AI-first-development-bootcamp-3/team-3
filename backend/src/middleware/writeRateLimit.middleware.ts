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

/** Separate store from the report-write one: logging out must not consume a
 * caller's report-write budget, nor the other way round. */
export const logoutRateLimitStore = new MemoryStore();

function retryAfterSeconds(resetTime: Date | undefined): number {
  if (!resetTime) {
    return env.RATE_LIMIT_WINDOW_SECONDS;
  }
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}

/** Shared by both limiters below: answer a throttled request with exactly the
 * body and `Retry-After` header the credential routes already produce, rather
 * than express-rate-limit's own default response. */
function rejectAsTooManyRequests(
  req: Request,
  _res: unknown,
  next: (err: AppError) => void,
): void {
  // The library attaches this to the request but ships no module augmentation
  // for it, so Express's own type doesn't know about it.
  const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
  next(AppError.tooManyRequests(retryAfterSeconds(info?.resetTime)));
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
  handler: rejectAsTooManyRequests,
});

/**
 * Bounds how fast one address can drive `POST /logout`. That route's work is
 * a token verify, a user row read, and a one-row write — individually cheap,
 * but nothing else caps how often an unauthenticated caller can make the
 * server do it.
 *
 * Mounted *ahead* of `authenticate`, which is the whole point: CodeQL's
 * js/missing-rate-limiting flags each route handler that performs
 * authorization and is not preceded by a limiter it recognises, so a limiter
 * sitting after `authenticate` leaves `authenticate` itself unprotected — both
 * in the query's eyes and in fact. Running first means it is necessarily
 * address-keyed: any identity read from a not-yet-verified token is exactly as
 * attacker-controlled as a spoofed X-Forwarded-For, the same reasoning
 * `/me/password` records in auth.routes.ts.
 *
 * A throttled logout is not a lockout: the client tears its own session down
 * in a `finally` regardless of this response (frontend D8), so the caller
 * still ends up logged out locally and only server-side revocation is
 * deferred to the token's own expiry.
 */
export const logoutRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1000,
  limit: env.RATE_LIMIT_LOGOUT_MAX_REQUESTS,
  store: logoutRateLimitStore,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  handler: rejectAsTooManyRequests,
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
