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

/** Exported so tests can clear the counters between cases. Separate from the
 * write and logout stores: reading the month must not spend a caller's budget
 * for saving it. */
export const reportReadRateLimitStore = new MemoryStore();

/**
 * Bounds how fast one address can drive the report read routes (the monthly
 * list). Like the write limiter it counts every request, not only failures.
 *
 * Mounted *ahead* of `authenticate` for the same reason `logoutRateLimit` is:
 * that middleware's token verify and user-row read are the work most worth
 * capping against an unauthenticated caller, and a limiter placed after it
 * leaves it unprotected — both to CodeQL's js/missing-rate-limiting and in
 * fact. Running first makes this necessarily address-keyed, since no verified
 * identity exists yet.
 *
 * Sized for that shared key on the same ~10-people-per-office-NAT assumption
 * as RATE_LIMIT_IP_MAX_ATTEMPTS, so a colleague behind the same address cannot
 * exhaust the budget by browsing months.
 */
export const readRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1000,
  limit: env.RATE_LIMIT_READ_MAX_REQUESTS,
  store: reportReadRateLimitStore,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  handler: rejectAsTooManyRequests,
});

/** Exported so tests can clear the counters between cases. */
export const authGuardRateLimitStore = new MemoryStore();

/**
 * Caps how fast one address can make `authenticate` do its work — a token
 * verify and a user-row read — on routes whose own limiter is keyed by the
 * caller and therefore has to run *after* authentication.
 *
 * Those two orderings want different things and cannot be the same limiter: a
 * per-caller budget needs a verified identity, while protecting the identity
 * check itself has to happen before there is one. So this runs first and is
 * address-keyed, and the route's own limiter still runs afterwards to bound
 * what a single authenticated caller can do.
 *
 * Sized well above ordinary use on purpose. It is the outer of two limits and
 * a whole office can share one address, so it exists to stop an unauthenticated
 * flood rather than to shape a legitimate caller's traffic — the inner
 * per-caller limiter does that.
 */
export const authGuardRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1000,
  limit: env.RATE_LIMIT_AUTH_GUARD_MAX_REQUESTS,
  store: authGuardRateLimitStore,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  handler: rejectAsTooManyRequests,
});
