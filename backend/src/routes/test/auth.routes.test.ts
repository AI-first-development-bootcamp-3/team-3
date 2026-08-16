import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
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
