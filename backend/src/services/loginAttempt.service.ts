import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { LoginAttemptOutcome } from '../generated/prisma/enums.js';

export type { LoginAttemptOutcome };

export interface LockEvaluation {
  locked: boolean;
  /** Seconds until the lock lifts. 0 when not locked. */
  retryAfterSeconds: number;
}

/**
 * Matches normaliseAccountKey in rateLimit.middleware.ts, so the throttle
 * and the lock bucket the same submitted email identically.
 */
function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Records one credential attempt in the durable, append-only audit trail.
 * Never writes the submitted password. Resolves a matching user (including
 * an inactive one) purely so the trail is joinable for review - nothing
 * reads userId back to make a lock decision, which is what keeps the lock
 * itself from becoming an account-existence oracle. See
 * openspec/changes/login-account-lockout/design.md.
 */
export async function recordLoginAttempt(params: {
  email: string;
  ipAddress: string;
  outcome: LoginAttemptOutcome;
}): Promise<void> {
  const emailNormalised = normaliseEmail(params.email);

  // See auth.middleware.ts for why `isActive: undefined` needs the cast:
  // it's the soft-delete extension's documented opt-out, not a real filter,
  // and an inactive account's attempts should still be resolvable in the trail.
  const user = await prisma.user.findFirst({
    where: { email: { equals: emailNormalised, mode: 'insensitive' }, isActive: undefined } as unknown as Prisma.UserWhereInput,
    select: { id: true },
  });

  const data: Prisma.LoginAttemptUncheckedCreateInput = {
    emailNormalised,
    ipAddress: params.ipAddress,
    outcome: params.outcome,
  };
  if (user?.id) {
    data.userId = user.id;
  }

  await prisma.loginAttempt.create({ data });
}

/**
 * Derives the current lock state for an email from recorded attempts,
 * rather than reading a stored flag - see design.md, "Derive the lock from
 * recorded attempts, not from a stored lock flag".
 *
 * The lock is a sliding window over the most recent LOCKOUT_MAX_ATTEMPTS
 * CREDENTIAL_REJECTED attempts since the last success (or the start of the
 * accumulation window, if sooner): the oldest of that most-recent group
 * anchors a fixed lockedUntil = anchor.createdAt + LOCKOUT_DURATION_MINUTES.
 * Attempts refused while already locked are recorded as LOCKED, not
 * CREDENTIAL_REJECTED, so they never move the anchor - which is what makes
 * retrying while locked fail to extend the lock, and what makes the lock
 * self-expire instead of re-arming itself from the same failures.
 */
export async function evaluateLock(email: string): Promise<LockEvaluation> {
  const emailNormalised = normaliseEmail(email);
  const windowStart = new Date(Date.now() - env.LOCKOUT_WINDOW_HOURS * 60 * 60 * 1000);

  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { emailNormalised, outcome: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
  });

  const cutoff = lastSuccess && lastSuccess.createdAt > windowStart ? lastSuccess.createdAt : windowStart;

  const recentFailures = await prisma.loginAttempt.findMany({
    where: {
      emailNormalised,
      outcome: 'CREDENTIAL_REJECTED',
      createdAt: { gt: cutoff },
    },
    orderBy: { createdAt: 'desc' },
    take: env.LOCKOUT_MAX_ATTEMPTS,
  });

  if (recentFailures.length < env.LOCKOUT_MAX_ATTEMPTS) {
    return { locked: false, retryAfterSeconds: 0 };
  }

  const anchor = recentFailures[recentFailures.length - 1];
  if (!anchor) {
    return { locked: false, retryAfterSeconds: 0 };
  }
  const lockedUntilMs = anchor.createdAt.getTime() + env.LOCKOUT_DURATION_MINUTES * 60 * 1000;
  const remainingMs = lockedUntilMs - Date.now();

  if (remainingMs <= 0) {
    return { locked: false, retryAfterSeconds: 0 };
  }

  return { locked: true, retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) };
}
