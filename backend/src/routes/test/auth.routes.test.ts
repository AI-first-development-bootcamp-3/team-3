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
