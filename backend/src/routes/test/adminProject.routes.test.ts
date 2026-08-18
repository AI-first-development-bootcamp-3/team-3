import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { ReportFormat, Role } from '../../generated/prisma/enums.js';
import { createClient, createProject, createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /admin/projects', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('lists projects with client names', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const client = await createClient({ name: 'Acme' });
    await createProject({ name: 'Atlas', clientId: client.id });

    const response = await request(app).get('/admin/projects').set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.projects).toHaveLength(1);
    expect(response.body.projects[0]).toMatchObject({
      name: 'Atlas',
      clientName: 'Acme',
      clientId: client.id,
      isActive: true,
      reportFormat: ReportFormat.SUM_HOURS,
    });
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const response = await request(app).get('/admin/projects').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const response = await request(app).get('/admin/projects');
    expect(response.status).toBe(401);
  });
});

describe('POST /admin/projects', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('creates a project under an active client', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const client = await createClient({ name: 'Acme' });

    const response = await request(app)
      .post('/admin/projects')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Atlas', clientId: client.id });

    expect(response.status).toBe(201);
    expect(response.body.project).toMatchObject({
      name: 'Atlas',
      clientId: client.id,
      clientName: 'Acme',
      isActive: true,
      // Default flipped to SUM_HOURS by report-format-aware-entry (design D8):
      // a project nobody configured keeps reporting the way it does today.
      reportFormat: ReportFormat.SUM_HOURS,
    });
  });

  it('rejects an inactive client with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const client = await createClient({ name: 'Gone', isActive: false });

    const response = await request(app)
      .post('/admin/projects')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Atlas', clientId: client.id });

    expect(response.status).toBe(400);
  });

  it('rejects a missing name with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const client = await createClient();

    const response = await request(app)
      .post('/admin/projects')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ clientId: client.id });

    expect(response.status).toBe(400);
  });
});

describe('PATCH /admin/projects/:id', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('updates name and report format', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const project = await createProject({ name: 'Old' });

    const response = await request(app)
      .patch(`/admin/projects/${project.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'New', reportFormat: ReportFormat.SUM_HOURS });

    expect(response.status).toBe(200);
    expect(response.body.project).toMatchObject({ name: 'New', reportFormat: ReportFormat.SUM_HOURS });
  });

  it('soft-deletes a project without removing the row', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const project = await createProject({ name: 'Atlas' });

    const response = await request(app)
      .patch(`/admin/projects/${project.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.project.isActive).toBe(false);

    const listResponse = await request(app).get('/admin/projects').set('Authorization', `Bearer ${tokenFor(admin)}`);
    const listed = listResponse.body.projects.find((item: { id: string }) => item.id === project.id);
    expect(listed).toMatchObject({ id: project.id, isActive: false });
  });

  it('returns 404 for an unknown id', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .patch(`/admin/projects/${crypto.randomUUID()}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Anything' });

    expect(response.status).toBe(404);
  });
});
