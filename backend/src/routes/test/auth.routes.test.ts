import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { rateLimitStore } from '../../middleware/rateLimit.middleware.js';
import { logoutRateLimitStore } from '../../middleware/writeRateLimit.middleware.js';
import { createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * The attempt-recording write in rateLimit.middleware.ts is deliberately
 * fire-and-forget (never awaited by the response) so a slow or failing
 * write cannot delay or break the client's response - see
 * openspec/changes/login-account-lockout/design.md, "Hook into the
 * existing res.on('finish') seam". Every test in this file hits a
 * credential-handling route, so every `afterEach` here calls this before
 * `resetDatabase()`: without it, a write from the test that just finished
 * can still be committing an INSERT into login_attempts when the next
 * test's TRUNCATE starts, which Postgres can resolve as a deadlock -
 * resetDatabase's own retry is a backstop for the rare remaining case, not
 * a substitute for settling here first.
 */
async function flushAttemptWrites(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

describe('POST /login', () => {
  afterEach(async () => {
    await flushAttemptWrites();
    await resetDatabase();
  });

  it('issues a token for correct credentials', async () => {
    const user = await createUser({ email: 'login-ok@example.test' });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-ok@example.test', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      id: user.id,
      email: 'login-ok@example.test',
      mustChangePassword: false,
    });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password', async () => {
    await createUser({ email: 'login-wrong-pw@example.test' });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-wrong-pw@example.test', password: 'not-the-password' });

    expect(response.status).toBe(401);
  });

  it('rejects an unknown email', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'nobody@example.test', password: 'password123' });

    expect(response.status).toBe(401);
  });

  it('rejects an inactive account even with the correct password', async () => {
    await createUser({ email: 'login-inactive@example.test', isActive: false });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-inactive@example.test', password: 'password123' });

    expect(response.status).toBe(401);
  });

  it('rejects a malformed body', async () => {
    const response = await request(app).post('/login').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
  });

  it('reports mustChangePassword: true for a newly created user', async () => {
    await createUser({ email: 'login-must-change@example.test', mustChangePassword: true });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-must-change@example.test', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.user.mustChangePassword).toBe(true);
  });

  function expiryOf(token: string): number {
    const decoded = jwt.decode(token) as { exp: number };
    return decoded.exp;
  }

  it('issues the default-lifetime token when rememberMe is omitted', async () => {
    await createUser({ email: 'login-default-lifetime@example.test' });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-default-lifetime@example.test', password: 'password123' });

    expect(response.status).toBe(200);
    const decoded = jwt.decode(response.body.token) as { iat: number; exp: number };
    expect(decoded.exp - decoded.iat).toBe(env.JWT_EXPIRES_IN_SECONDS);
  });

  it('issues the default-lifetime token when rememberMe is false', async () => {
    await createUser({ email: 'login-remember-false@example.test' });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-remember-false@example.test', password: 'password123', rememberMe: false });

    expect(response.status).toBe(200);
    const decoded = jwt.decode(response.body.token) as { iat: number; exp: number };
    expect(decoded.exp - decoded.iat).toBe(env.JWT_EXPIRES_IN_SECONDS);
  });

  it('issues the extended-lifetime token when rememberMe is true', async () => {
    await createUser({ email: 'login-remember-true@example.test' });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-remember-true@example.test', password: 'password123', rememberMe: true });

    expect(response.status).toBe(200);
    const decoded = jwt.decode(response.body.token) as { iat: number; exp: number };
    expect(decoded.exp - decoded.iat).toBe(env.JWT_REMEMBER_ME_EXPIRES_IN_SECONDS);
  });

  it('gives a remembered token a strictly later expiry than a default one', async () => {
    await createUser({ email: 'login-compare-a@example.test' });
    await createUser({ email: 'login-compare-b@example.test' });

    const defaultResponse = await request(app)
      .post('/login')
      .send({ email: 'login-compare-a@example.test', password: 'password123' });
    const rememberedResponse = await request(app)
      .post('/login')
      .send({ email: 'login-compare-b@example.test', password: 'password123', rememberMe: true });

    expect(expiryOf(rememberedResponse.body.token)).toBeGreaterThan(expiryOf(defaultResponse.body.token));
  });

  it('rejects a non-boolean rememberMe value', async () => {
    await createUser({ email: 'login-bad-remember@example.test' });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-bad-remember@example.test', password: 'password123', rememberMe: 'yes' });

    expect(response.status).toBe(400);
  });

  it('does not put rememberMe in the JWT payload', async () => {
    await createUser({ email: 'login-no-remember-claim@example.test' });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-no-remember-claim@example.test', password: 'password123', rememberMe: true });

    expect(response.status).toBe(200);
    const decoded = jwt.decode(response.body.token) as Record<string, unknown>;
    expect(decoded).not.toHaveProperty('rememberMe');
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'role', 'sub']);
  });

  it('returns an expiresAt matching the token\'s exp claim', async () => {
    await createUser({ email: 'login-expires-at@example.test' });

    const response = await request(app)
      .post('/login')
      .send({ email: 'login-expires-at@example.test', password: 'password123' });

    expect(response.status).toBe(200);
    const expiresAtSeconds = Math.floor(new Date(response.body.expiresAt).getTime() / 1000);
    expect(expiresAtSeconds).toBe(expiryOf(response.body.token));
  });
});

describe('POST /logout', () => {
  // The route's limiter is address-keyed and every case here calls it from the
  // same test address, so the quota has to be cleared between cases or the
  // later ones would start seeing 429s instead of what they assert.
  beforeEach(async () => {
    await logoutRateLimitStore.resetAll();
  });

  afterEach(async () => {
    await logoutRateLimitStore.resetAll();
    await flushAttemptWrites();
    await resetDatabase();
  });

  /**
   * The revocation boundary compares at whole-second resolution and floors
   * it (design.md D2), so a token signed and then immediately logged out
   * with in the same wall-clock second is deliberately NOT revoked - that
   * is the fail-open that keeps an instant re-login from being refused.
   * Tests that need a token to actually be revoked by a later /logout call
   * must let a full second elapse first, rather than relying on real login
   * and logout calls happening to land in different seconds - which would
   * make the test flaky depending on which second it runs in.
   */
  async function sleepPastSecondBoundary(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  it('logs out and returns 204 with no body', async () => {
    const user = await createUser();
    const token = tokenFor(user);

    const response = await request(app).post('/logout').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });

  it('refuses the same token on a protected endpoint after logout, with SESSION_REVOKED', async () => {
    const user = await createUser();
    const token = tokenFor(user);
    await sleepPastSecondBoundary();

    const logoutResponse = await request(app).post('/logout').set('Authorization', `Bearer ${token}`);
    expect(logoutResponse.status).toBe(204);

    const reuse = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('SESSION_REVOKED');
  });

  it('rejects logout with no token', async () => {
    const response = await request(app).post('/logout');

    expect(response.status).toBe(401);
  });

  it('revokes a second token from a separate login for the same user (global revocation)', async () => {
    const user = await createUser();
    const tokenFromDeviceOne = tokenFor(user);
    const tokenFromDeviceTwo = tokenFor(user);
    await sleepPastSecondBoundary();

    const logoutResponse = await request(app)
      .post('/logout')
      .set('Authorization', `Bearer ${tokenFromDeviceOne}`);
    expect(logoutResponse.status).toBe(204);

    const deviceOneReuse = await request(app)
      .get('/sample/protected')
      .set('Authorization', `Bearer ${tokenFromDeviceOne}`);
    const deviceTwoReuse = await request(app)
      .get('/sample/protected')
      .set('Authorization', `Bearer ${tokenFromDeviceTwo}`);

    expect(deviceOneReuse.status).toBe(401);
    expect(deviceOneReuse.body.error.code).toBe('SESSION_REVOKED');
    expect(deviceTwoReuse.status).toBe(401);
    expect(deviceTwoReuse.body.error.code).toBe('SESSION_REVOKED');
  });

  it('ignores a body-supplied user id - another account\'s token still works after a caller logs out naming it', async () => {
    const caller = await createUser();
    const otherAccount = await createUser();
    const callerToken = tokenFor(caller);
    const otherAccountToken = tokenFor(otherAccount);

    const response = await request(app)
      .post('/logout')
      .set('Authorization', `Bearer ${callerToken}`)
      .send({ userId: otherAccount.id });

    expect(response.status).toBe(204);

    const otherAccountStillWorks = await request(app)
      .get('/sample/protected')
      .set('Authorization', `Bearer ${otherAccountToken}`);
    expect(otherAccountStillWorks.status).toBe(200);
  });

  it('lets logging in again after logout yield a working token, while the pre-logout token stays refused', async () => {
    const user = await createUser({ email: 'logout-then-relogin@example.test' });
    const preLogoutToken = tokenFor(user);
    await sleepPastSecondBoundary();

    const logoutResponse = await request(app).post('/logout').set('Authorization', `Bearer ${preLogoutToken}`);
    expect(logoutResponse.status).toBe(204);

    const loginResponse = await request(app)
      .post('/login')
      .send({ email: 'logout-then-relogin@example.test', password: 'password123' });
    expect(loginResponse.status).toBe(200);
    const newToken = loginResponse.body.token as string;

    const newTokenWorks = await request(app).get('/sample/protected').set('Authorization', `Bearer ${newToken}`);
    expect(newTokenWorks.status).toBe(200);

    const preLogoutStillRefused = await request(app)
      .get('/sample/protected')
      .set('Authorization', `Bearer ${preLogoutToken}`);
    expect(preLogoutStillRefused.status).toBe(401);
    expect(preLogoutStillRefused.body.error.code).toBe('SESSION_REVOKED');
  });
});

describe('logout rate limiting', () => {
  const MAX = env.RATE_LIMIT_LOGOUT_MAX_REQUESTS;

  beforeEach(async () => {
    await logoutRateLimitStore.resetAll();
  });

  afterEach(async () => {
    await logoutRateLimitStore.resetAll();
    await flushAttemptWrites();
    await resetDatabase();
  });

  /**
   * Spends the whole quota with tokenless calls. That those count at all is
   * the property under test as much as the quota itself: the limiter is
   * mounted ahead of `authenticate` so the token verify and user-row read it
   * performs sit *behind* the limiter, which is what stops an unauthenticated
   * caller making the server do that work for free.
   */
  function exhaustQuota(): Promise<unknown[]> {
    return Promise.all(
      Array.from({ length: MAX }, () => request(app).post('/logout').expect(401)),
    );
  }

  it('answers 429 with Retry-After once an address passes the logout quota', async () => {
    await exhaustQuota();

    const throttled = await request(app).post('/logout');

    expect(throttled.status).toBe(429);
    expect(Number(throttled.headers['retry-after'])).toBeGreaterThan(0);
    expect(throttled.body).toEqual({
      error: { code: 'TOO_MANY_REQUESTS', message: expect.any(String) },
    });
  });

  it('throttles a caller holding a valid token too, not only tokenless ones', async () => {
    const user = await createUser({ email: 'logout-quota@example.test' });
    await exhaustQuota();

    const throttled = await request(app)
      .post('/logout')
      .set('Authorization', `Bearer ${tokenFor(user)}`);

    expect(throttled.status).toBe(429);
  });

  it('leaves a logout inside the quota working normally', async () => {
    const user = await createUser({ email: 'logout-within-quota@example.test' });

    const response = await request(app)
      .post('/logout')
      .set('Authorization', `Bearer ${tokenFor(user)}`);

    expect(response.status).toBe(204);
  });
});

describe('PATCH /me/password', () => {
  afterEach(async () => {
    await flushAttemptWrites();
    await resetDatabase();
  });

  it('sets a new password and clears mustChangePassword', async () => {
    const user = await createUser({ email: 'change-pw@example.test', mustChangePassword: true });

    const response = await request(app)
      .patch('/me/password')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ newPassword: 'a-brand-new-password' });

    expect(response.status).toBe(200);
    expect(response.body.mustChangePassword).toBe(false);

    const loginResponse = await request(app)
      .post('/login')
      .send({ email: 'change-pw@example.test', password: 'a-brand-new-password' });
    expect(loginResponse.status).toBe(200);
  });

  it('rejects an unauthenticated caller', async () => {
    const response = await request(app).patch('/me/password').send({ newPassword: 'a-brand-new-password' });

    expect(response.status).toBe(401);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const user = await createUser();

    const response = await request(app)
      .patch('/me/password')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ newPassword: 'short' });

    expect(response.status).toBe(400);
  });
});

describe('login rate limiting', () => {
  const EMAIL_MAX = env.RATE_LIMIT_EMAIL_MAX_ATTEMPTS;
  const IP_MAX = env.RATE_LIMIT_IP_MAX_ATTEMPTS;

  beforeEach(() => {
    rateLimitStore.reset();
  });

  afterEach(async () => {
    await flushAttemptWrites();
    await resetDatabase();
  });

  it('does not throttle attempts below the email threshold, and their 401s look unchanged', async () => {
    const email = 'ratelimit-below-threshold@example.test';

    for (let i = 0; i < EMAIL_MAX - 1; i++) {
      const response = await request(app).post('/login').send({ email, password: 'wrong' });
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
      expect(response.headers['retry-after']).toBeUndefined();
    }
  });

  it('trips the email threshold to 429 with Retry-After, and still refuses correct credentials while throttled', async () => {
    const user = await createUser({ email: 'ratelimit-trip@example.test' });

    for (let i = 0; i < EMAIL_MAX; i++) {
      const response = await request(app).post('/login').send({ email: user.email, password: 'wrong-password' });
      expect(response.status).toBe(401);
    }

    const throttled = await request(app).post('/login').send({ email: user.email, password: 'password123' });

    expect(throttled.status).toBe(429);
    expect(throttled.headers['retry-after']).toMatch(/^\d+$/);
    expect(Number(throttled.headers['retry-after'])).toBeGreaterThan(0);
    expect(throttled.body).toEqual({
      error: { code: 'TOO_MANY_REQUESTS', message: expect.any(String) },
    });
  });

  it('throttles a registered and an unregistered email identically', async () => {
    const registered = await createUser({ email: 'ratelimit-oracle-real@example.test' });
    const unregistered = 'ratelimit-oracle-fake@example.test';

    for (let i = 0; i < EMAIL_MAX; i++) {
      await request(app).post('/login').send({ email: registered.email, password: 'wrong' });
      await request(app).post('/login').send({ email: unregistered, password: 'wrong' });
    }

    const realThrottled = await request(app).post('/login').send({ email: registered.email, password: 'wrong' });
    const fakeThrottled = await request(app).post('/login').send({ email: unregistered, password: 'wrong' });

    expect(realThrottled.status).toBe(429);
    expect(fakeThrottled.status).toBe(429);
    expect(realThrottled.body).toEqual(fakeThrottled.body);
  });

  it('trips the address threshold at the configured max, and not one attempt below it', async () => {
    for (let i = 0; i < IP_MAX; i++) {
      const response = await request(app)
        .post('/login')
        .send({ email: `ratelimit-addr-${i}@example.test`, password: 'wrong' });
      expect(response.status).toBe(401);
    }

    const blocked = await request(app).post('/login').send({ email: 'ratelimit-addr-final@example.test', password: 'wrong' });

    expect(blocked.status).toBe(429);
  });

  it('does not count a 400 (malformed body) toward either threshold', async () => {
    const email = 'ratelimit-malformed@example.test';

    for (let i = 0; i < EMAIL_MAX; i++) {
      const response = await request(app).post('/login').send({ email }); // no password -> 400
      expect(response.status).toBe(400);
    }

    const wellFormed = await request(app).post('/login').send({ email, password: 'wrong' });
    expect(wellFormed.status).toBe(401);
  });

  it('clears the email counter on success, and the window elapsing restores access with no intervention', async () => {
    const user = await createUser({ email: 'ratelimit-recovery@example.test' });

    for (let i = 0; i < EMAIL_MAX - 1; i++) {
      await request(app).post('/login').send({ email: user.email, password: 'wrong' });
    }

    const success = await request(app).post('/login').send({ email: user.email, password: 'password123' });
    expect(success.status).toBe(200);

    // A fresh run of EMAIL_MAX failures starts from zero, proving the success
    // cleared the count. The request that brings the count *to* the
    // threshold still gets 401 itself - check() runs before the failure it
    // caused is recorded, so only the request *after* this run sees 429.
    for (let i = 0; i < EMAIL_MAX; i++) {
      const response = await request(app).post('/login').send({ email: user.email, password: 'wrong' });
      expect(response.status).toBe(401);
    }

    // Explicit `now`: vitest's fake clock defaults to the Unix epoch, which
    // would make every timestamp already recorded under the real clock look
    // impossibly far in the future and never age out.
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() });
    try {
      const tripped = await request(app).post('/login').send({ email: user.email, password: 'wrong' });
      expect(tripped.status).toBe(429);

      vi.advanceTimersByTime((env.RATE_LIMIT_WINDOW_SECONDS + 1) * 1000);

      const afterWindow = await request(app).post('/login').send({ email: user.email, password: 'wrong' });
      expect(afterWindow.status).toBe(401);
    } finally {
      vi.useRealTimers();
    }
  });

  it('throttles PATCH /me/password by address, and switching routes does not reset that counter', async () => {
    const badToken = 'not-a-valid-token';

    for (let i = 0; i < IP_MAX - 1; i++) {
      const response = await request(app)
        .patch('/me/password')
        .set('Authorization', `Bearer ${badToken}`)
        .send({ newPassword: 'a-brand-new-password' });
      expect(response.status).toBe(401);
    }

    // One more failure, on the *other* route, tips the shared address
    // counter over - proving it is not reset by switching routes.
    const finalOnOtherRoute = await request(app)
      .post('/login')
      .send({ email: 'ratelimit-switch@example.test', password: 'wrong' });
    expect(finalOnOtherRoute.status).toBe(401);

    const blocked = await request(app)
      .patch('/me/password')
      .set('Authorization', `Bearer ${badToken}`)
      .send({ newPassword: 'a-brand-new-password' });
    expect(blocked.status).toBe(429);
  });
});

describe('login account lockout', () => {
  const LOCKOUT_MAX = env.LOCKOUT_MAX_ATTEMPTS;
  const EMAIL_MAX = env.RATE_LIMIT_EMAIL_MAX_ATTEMPTS;

  beforeEach(() => {
    rateLimitStore.reset();
  });

  afterEach(async () => {
    await flushAttemptWrites();
    await resetDatabase();
  });

  /**
   * Drives `count` genuine 401s for one email through the real endpoint
   * without ever tripping the in-memory throttle (EMAIL_MAX), by resetting
   * that store between bursts smaller than its threshold. The throttle and
   * the lock are independent tiers with independent storage - see
   * design.md - so this is a legitimate way to accumulate durable
   * CREDENTIAL_REJECTED rows for a lock test.
   *
   * Flushes attempt writes before returning: every caller immediately
   * checks a lock decision (or a row count) that depends on every one of
   * these attempts having actually landed in `login_attempts`, not just
   * having been responded to - see flushAttemptWrites above.
   */
  async function failCredentialsBypassingThrottle(email: string, count: number, password = 'wrong-password'): Promise<void> {
    let remaining = count;
    while (remaining > 0) {
      rateLimitStore.reset();
      const burst = Math.min(remaining, EMAIL_MAX - 1);
      for (let i = 0; i < burst; i++) {
        const response = await request(app).post('/login').send({ email, password });
        expect(response.status).toBe(401);
      }
      remaining -= burst;
    }
    await flushAttemptWrites();
  }

  /** Seeds `count` durable CREDENTIAL_REJECTED rows directly, spaced `stepMs`
   * apart, ending `agoMs` before now. Bypasses the endpoint entirely so
   * timing-sensitive tests don't depend on the real clock or on fake-timers
   * (which cannot move the database's own `createdAt` default - see
   * design.md, "Clock skew across replicas"). */
  async function seedFailures(
    email: string,
    count: number,
    { agoMs, stepMs = 1000 }: { agoMs: number; stepMs?: number },
  ): Promise<void> {
    const emailNormalised = email.trim().toLowerCase();
    const start = Date.now() - agoMs - (count - 1) * stepMs;
    for (let i = 0; i < count; i++) {
      await prisma.loginAttempt.create({
        data: {
          emailNormalised,
          ipAddress: '127.0.0.1',
          outcome: 'CREDENTIAL_REJECTED',
          createdAt: new Date(start + i * stepMs),
        },
      });
    }
  }

  it('trips the lock at the configured threshold and not one attempt below it', async () => {
    const email = 'lockout-threshold@example.test';

    await failCredentialsBypassingThrottle(email, LOCKOUT_MAX - 1);
    rateLimitStore.reset();
    const stillBelow = await request(app).post('/login').send({ email, password: 'wrong-password' });
    expect(stillBelow.status).toBe(401);

    rateLimitStore.reset();
    const locked = await request(app).post('/login').send({ email, password: 'wrong-password' });

    expect(locked.status).toBe(423);
    expect(locked.headers['retry-after']).toMatch(/^\d+$/);
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);
    expect(locked.body).toEqual({ error: { code: 'LOCKED', message: expect.any(String) } });
  });

  it('refuses correct credentials while locked, and issues no session', async () => {
    const user = await createUser({ email: 'lockout-correct-pw@example.test' });
    await failCredentialsBypassingThrottle(user.email, LOCKOUT_MAX);

    rateLimitStore.reset();
    const response = await request(app).post('/login').send({ email: user.email, password: 'password123' });

    expect(response.status).toBe(423);
    expect(response.body.token).toBeUndefined();
  });

  it('locks a registered and an unregistered email identically', async () => {
    const registered = await createUser({ email: 'lockout-oracle-real@example.test' });
    const unregistered = 'lockout-oracle-fake@example.test';

    await failCredentialsBypassingThrottle(registered.email, LOCKOUT_MAX);
    await failCredentialsBypassingThrottle(unregistered, LOCKOUT_MAX);

    rateLimitStore.reset();
    const realLocked = await request(app).post('/login').send({ email: registered.email, password: 'wrong' });
    rateLimitStore.reset();
    const fakeLocked = await request(app).post('/login').send({ email: unregistered, password: 'wrong' });

    expect(realLocked.status).toBe(423);
    expect(fakeLocked.status).toBe(423);
    expect(realLocked.body).toEqual(fakeLocked.body);
  });

  it('reports a decreasing Retry-After while locked, and does not extend the lock', async () => {
    const email = 'lockout-retry-after@example.test';
    // Anchor is 5 seconds old: comfortably inside the lock, with the vast
    // majority of the duration still remaining.
    await seedFailures(email, LOCKOUT_MAX, { agoMs: 5000 });

    const first = await request(app).post('/login').send({ email, password: 'wrong' });
    expect(first.status).toBe(423);
    const firstRetryAfter = Number(first.headers['retry-after']);

    // This attempt is refused while already locked, so it is recorded as
    // LOCKED, not CREDENTIAL_REJECTED - it must not push the anchor forward.
    const second = await request(app).post('/login').send({ email, password: 'wrong' });
    expect(second.status).toBe(423);
    const secondRetryAfter = Number(second.headers['retry-after']);

    expect(secondRetryAfter).toBeLessThanOrEqual(firstRetryAfter);
    // Not reset back up near the full configured duration - proves the
    // second attempt did not re-arm the lock from scratch.
    expect(secondRetryAfter).toBeLessThan(env.LOCKOUT_DURATION_MINUTES * 60);
  });

  it('expires the lock on its own once the duration elapses, with no intervention', async () => {
    const email = 'lockout-expiry@example.test';
    const alreadyExpiredAgoMs = (env.LOCKOUT_DURATION_MINUTES + 5) * 60 * 1000;
    await seedFailures(email, LOCKOUT_MAX, { agoMs: alreadyExpiredAgoMs });

    const response = await request(app).post('/login').send({ email, password: 'wrong' });

    // Back to ordinary credential handling, not locked - and since the
    // throttle store was reset in beforeEach, this is a plain 401.
    expect(response.status).toBe(401);
  });

  it('clears accumulated failures on success, and the failure rows survive that clearing unaltered', async () => {
    const user = await createUser({ email: 'lockout-success-clears@example.test' });
    await failCredentialsBypassingThrottle(user.email, EMAIL_MAX - 1);

    rateLimitStore.reset();
    const success = await request(app).post('/login').send({ email: user.email, password: 'password123' });
    expect(success.status).toBe(200);
    await flushAttemptWrites();

    const emailNormalised = user.email.trim().toLowerCase();
    const failuresBeforeSuccess = await prisma.loginAttempt.count({
      where: { emailNormalised, outcome: 'CREDENTIAL_REJECTED' },
    });
    expect(failuresBeforeSuccess).toBe(EMAIL_MAX - 1);

    // A fresh run of LOCKOUT_MAX failures after the success must still
    // reach the full threshold before locking - proving the pre-success
    // failures no longer count, without their rows having been touched.
    await failCredentialsBypassingThrottle(user.email, LOCKOUT_MAX - 1);
    rateLimitStore.reset();
    const stillUnlocked = await request(app).post('/login').send({ email: user.email, password: 'wrong' });
    expect(stillUnlocked.status).toBe(401);
    await flushAttemptWrites();

    const failuresAfterSecondRun = await prisma.loginAttempt.count({
      where: { emailNormalised, outcome: 'CREDENTIAL_REJECTED' },
    });
    expect(failuresAfterSecondRun).toBe(EMAIL_MAX - 1 + LOCKOUT_MAX);
  });

  it('survives a rebuilt in-memory rate-limit store, proving the lock is not process-local', async () => {
    const email = 'lockout-survives-restart@example.test';
    await failCredentialsBypassingThrottle(email, LOCKOUT_MAX);

    // Simulates the in-memory throttle store being rebuilt on process
    // restart. The lock is derived from the database, not this store, so
    // it must be unaffected.
    rateLimitStore.reset();

    const response = await request(app).post('/login').send({ email, password: 'wrong' });
    expect(response.status).toBe(423);
  });

  it('records attempt rows with the expected fields, and never records the submitted password', async () => {
    const user = await createUser({ email: 'lockout-audit-fields@example.test' });
    const unregistered = 'lockout-audit-unregistered@example.test';
    const secretPassword = 'super-secret-password-value';

    await request(app).post('/login').send({ email: user.email, password: secretPassword });
    await request(app).post('/login').send({ email: unregistered, password: secretPassword });
    await flushAttemptWrites();

    const registeredRow = await prisma.loginAttempt.findFirstOrThrow({
      where: { emailNormalised: user.email.trim().toLowerCase() },
    });
    expect(registeredRow).toMatchObject({
      emailNormalised: user.email.trim().toLowerCase(),
      userId: user.id,
      outcome: 'CREDENTIAL_REJECTED',
    });
    expect(registeredRow.ipAddress).toEqual(expect.any(String));
    expect(registeredRow.createdAt).toBeInstanceOf(Date);

    const unregisteredRow = await prisma.loginAttempt.findFirstOrThrow({
      where: { emailNormalised: unregistered },
    });
    expect(unregisteredRow.userId).toBeNull();
    expect(unregisteredRow.outcome).toBe('CREDENTIAL_REJECTED');

    const allRows = await prisma.loginAttempt.findMany();
    const serialised = JSON.stringify(allRows);
    expect(serialised).not.toContain(secretPassword);
  });

  it('records nothing for a malformed request (400)', async () => {
    const email = 'lockout-malformed@example.test';

    const response = await request(app).post('/login').send({ email });
    expect(response.status).toBe(400);
    await flushAttemptWrites();

    const count = await prisma.loginAttempt.count({ where: { emailNormalised: email } });
    expect(count).toBe(0);
  });
});
