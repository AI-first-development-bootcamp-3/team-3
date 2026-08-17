import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { Role } from '../../generated/prisma/enums.js';
import { createClient, createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /admin/clients', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('lists all clients', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    await createClient({ name: 'Acme' });
    await createClient({ name: 'Globex' });

    const response = await request(app).get('/admin/clients').set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.clients).toHaveLength(2);
    expect(response.body.clients.map((c: { name: string }) => c.name).sort()).toEqual(['Acme', 'Globex']);
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });

    const response = await request(app).get('/admin/clients').set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const response = await request(app).get('/admin/clients');

    expect(response.status).toBe(401);
  });
});

describe('POST /admin/clients', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('creates a client, active by default', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .post('/admin/clients')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Acme' });

    expect(response.status).toBe(201);
    expect(response.body.client).toMatchObject({ name: 'Acme', isActive: true, contactDetails: null });
  });

  it('accepts optional contact details', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .post('/admin/clients')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Acme', contactDetails: 'ops@acme.test' });

    expect(response.status).toBe(201);
    expect(response.body.client.contactDetails).toBe('ops@acme.test');
  });

  it('rejects a missing name with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .post('/admin/clients')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });

    const response = await request(app)
      .post('/admin/clients')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ name: 'Blocked' });

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const response = await request(app).post('/admin/clients').send({ name: 'Blocked' });

    expect(response.status).toBe(401);
  });
});

describe('PATCH /admin/clients/:id', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('updates name and contact details', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const client = await createClient({ name: 'Old Name' });

    const response = await request(app)
      .patch(`/admin/clients/${client.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'New Name', contactDetails: 'new@contact.test' });

    expect(response.status).toBe(200);
    expect(response.body.client).toMatchObject({ name: 'New Name', contactDetails: 'new@contact.test' });
  });

  it('deactivates a client without deleting it - soft delete', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const client = await createClient({ name: 'Acme', isActive: true });

    const response = await request(app)
      .patch(`/admin/clients/${client.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.client.isActive).toBe(false);
    expect(response.body.client.id).toBe(client.id);

    // The record must still exist (soft-delete, not hard-delete) and still
    // appear in the admin's own list - unlike normal app queries, admin
    // management needs to see inactive entities too, to reactivate them.
    const listResponse = await request(app).get('/admin/clients').set('Authorization', `Bearer ${tokenFor(admin)}`);
    const listed = listResponse.body.clients.find((c: { id: string }) => c.id === client.id);
    expect(listed).toMatchObject({ id: client.id, isActive: false });
  });

  it('returns 404 for an unknown id', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .patch(`/admin/clients/${crypto.randomUUID()}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Anything' });

    expect(response.status).toBe(404);
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const client = await createClient();

    const response = await request(app)
      .patch(`/admin/clients/${client.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ name: 'Blocked' });

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const client = await createClient();

    const response = await request(app).patch(`/admin/clients/${client.id}`).send({ name: 'Blocked' });

    expect(response.status).toBe(401);
  });
});
