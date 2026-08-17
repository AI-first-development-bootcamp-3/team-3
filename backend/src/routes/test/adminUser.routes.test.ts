import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { Role } from '../../generated/prisma/enums.js';
import { emailSender } from '../../services/emailSender.js';
import { createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('POST /admin/users', () => {
  afterEach(async () => {
    await resetDatabase();
    vi.restoreAllMocks();
  });

  it('creates a user with a generated temporary password, mustChangePassword: true, no password hash leaked', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'new-user@example.test', displayName: 'New User', role: 'EMPLOYEE' });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: 'new-user@example.test',
      displayName: 'New User',
      role: 'EMPLOYEE',
      isActive: true,
      mustChangePassword: true,
    });
    expect(response.body.temporaryPassword).toEqual(expect.any(String));
    expect(response.body.user.passwordHash).toBeUndefined();

    const loginResponse = await request(app)
      .post('/login')
      .send({ email: 'new-user@example.test', password: response.body.temporaryPassword });
    expect(loginResponse.status).toBe(200);
  });

  it('accepts an admin-supplied temporary password instead of generating one', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        email: 'chosen-pw@example.test',
        displayName: 'Chosen Password',
        role: 'EMPLOYEE',
        temporaryPassword: 'a-chosen-temp-password',
      });

    expect(response.status).toBe(201);
    expect(response.body.temporaryPassword).toBe('a-chosen-temp-password');
  });

  it('rejects a duplicate email with 409', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    await createUser({ email: 'taken@example.test' });

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'taken@example.test', displayName: 'Duplicate', role: 'EMPLOYEE' });

    expect(response.status).toBe(409);
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ email: 'blocked@example.test', displayName: 'Blocked', role: 'EMPLOYEE' });

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const response = await request(app)
      .post('/admin/users')
      .send({ email: 'blocked@example.test', displayName: 'Blocked', role: 'EMPLOYEE' });

    expect(response.status).toBe(401);
  });

  it('rejects a malformed body (missing displayName, invalid role)', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'not-an-email', role: 'SUPERUSER' });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'displayName' }),
        expect.objectContaining({ field: 'role' }),
      ]),
    );
  });

  it('rejects an admin-supplied temporary password shorter than 8 characters', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'short-pw@example.test', displayName: 'Short Password', role: 'EMPLOYEE', temporaryPassword: 'short' });

    expect(response.status).toBe(400);
  });

  it('does not persist a user when the request is invalid', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'not-an-email', role: 'EMPLOYEE' });

    const found = await prisma.user.findFirst({ where: { email: 'not-an-email' } });
    expect(found).toBeNull();
  });

  it('sends the temporary password by email on successful creation', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const sendSpy = vi.spyOn(emailSender, 'send').mockResolvedValue(undefined);

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'emailed@example.test', displayName: 'Emailed User', role: 'EMPLOYEE' });

    expect(response.status).toBe(201);
    expect(sendSpy).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        to: 'emailed@example.test',
        text: expect.stringContaining(response.body.temporaryPassword),
      }),
    );
  });

  it('still creates the user and returns 201 when sending the credential email fails', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    vi.spyOn(emailSender, 'send').mockRejectedValue(new Error('SMTP is down'));

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'email-fails@example.test', displayName: 'Email Fails', role: 'EMPLOYEE' });

    expect(response.status).toBe(201);
    const found = await prisma.user.findUnique({ where: { email: 'email-fails@example.test' } });
    expect(found).not.toBeNull();
  });
});

describe('PATCH /admin/users/:id/reset-password', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('generates a new temporary password, sets mustChangePassword: true, and the new password logs in', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const target = await createUser({ email: 'reset-me@example.test', mustChangePassword: false });

    const response = await request(app)
      .patch(`/admin/users/${target.id}/reset-password`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.temporaryPassword).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ id: target.id, mustChangePassword: true });
    expect(response.body.user.passwordHash).toBeUndefined();

    const loginResponse = await request(app)
      .post('/login')
      .send({ email: 'reset-me@example.test', password: response.body.temporaryPassword });
    expect(loginResponse.status).toBe(200);
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const target = await createUser();

    const response = await request(app)
      .patch(`/admin/users/${target.id}/reset-password`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send();

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const target = await createUser();

    const response = await request(app).patch(`/admin/users/${target.id}/reset-password`).send();

    expect(response.status).toBe(401);
  });

  it('returns 404 for an unknown user id', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .patch(`/admin/users/${crypto.randomUUID()}/reset-password`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send();

    expect(response.status).toBe(404);
  });

  it('rejects a malformed id with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .patch('/admin/users/not-a-uuid/reset-password')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send();

    expect(response.status).toBe(400);
  });
});

describe('PATCH /admin/users/:id/role', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it("changes the user's role", async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const target = await createUser({ role: Role.EMPLOYEE });

    const response = await request(app)
      .patch(`/admin/users/${target.id}/role`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ id: target.id, role: 'ADMIN' });
    expect(response.body.user.passwordHash).toBeUndefined();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(updated.role).toBe(Role.ADMIN);
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const target = await createUser();

    const response = await request(app)
      .patch(`/admin/users/${target.id}/role`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const target = await createUser();

    const response = await request(app).patch(`/admin/users/${target.id}/role`).send({ role: 'ADMIN' });

    expect(response.status).toBe(401);
  });

  it('returns 404 for an unknown user id', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .patch(`/admin/users/${crypto.randomUUID()}/role`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(404);
  });

  it('rejects an invalid role value with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const target = await createUser();

    const response = await request(app)
      .patch(`/admin/users/${target.id}/role`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ role: 'SUPERUSER' });

    expect(response.status).toBe(400);
  });
});

describe('PATCH /admin/users/:id/status', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('deactivates an active user', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const target = await createUser({ isActive: true });

    const response = await request(app)
      .patch(`/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ id: target.id, isActive: false });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('reactivates a deactivated user', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const target = await createUser({ isActive: false });

    const response = await request(app)
      .patch(`/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: true });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ id: target.id, isActive: true });
  });

  it('setting isActive to the value the account already holds succeeds with 200', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const target = await createUser({ isActive: true });

    const response = await request(app)
      .patch(`/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: true });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ id: target.id, isActive: true });
  });

  it('rejects a non-admin caller with 403 and leaves the target unchanged', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const target = await createUser({ isActive: true });

    const response = await request(app)
      .patch(`/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ isActive: false });

    expect(response.status).toBe(403);

    const found = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(found.isActive).toBe(true);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const target = await createUser();

    const response = await request(app).patch(`/admin/users/${target.id}/status`).send({ isActive: false });

    expect(response.status).toBe(401);
  });

  it('rejects a missing isActive with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const target = await createUser();

    const response = await request(app)
      .patch(`/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('rejects a non-boolean isActive with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const target = await createUser();

    const response = await request(app)
      .patch(`/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: 'false' });

    expect(response.status).toBe(400);
  });

  it('rejects a malformed id with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .patch('/admin/users/not-a-uuid/status')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: false });

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown user id', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .patch(`/admin/users/${crypto.randomUUID()}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: false });

    expect(response.status).toBe(404);
  });
});
