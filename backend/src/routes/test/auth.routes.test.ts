import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { rateLimitStore } from '../../middleware/rateLimit.middleware.js';
import { createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('POST /login', () => {
  afterEach(async () => {
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

describe('PATCH /me/password', () => {
  afterEach(async () => {
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
