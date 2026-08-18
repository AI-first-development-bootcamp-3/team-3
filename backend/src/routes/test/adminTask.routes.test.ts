import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { Role, TaskStatus } from '../../generated/prisma/enums.js';
import { createProject, createTask, createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /admin/tasks', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('lists tasks with client and project names', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const project = await createProject({ name: 'Atlas' });
    await createTask({ name: 'Build', projectId: project.id });

    const response = await request(app).get('/admin/tasks').set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.tasks).toHaveLength(1);
    expect(response.body.tasks[0]).toMatchObject({
      name: 'Build',
      projectId: project.id,
      projectName: 'Atlas',
      status: TaskStatus.OPEN,
    });
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const response = await request(app).get('/admin/tasks').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(response.status).toBe(403);
  });
});

describe('POST /admin/tasks', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('creates a task under an active project', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const project = await createProject({ name: 'Atlas' });

    const response = await request(app)
      .post('/admin/tasks')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Build', projectId: project.id });

    expect(response.status).toBe(201);
    expect(response.body.task).toMatchObject({
      name: 'Build',
      projectId: project.id,
      projectName: 'Atlas',
      status: TaskStatus.OPEN,
      isActive: true,
    });
  });

  it('rejects an inactive project with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const project = await createProject({ name: 'Gone', isActive: false });

    const response = await request(app)
      .post('/admin/tasks')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Build', projectId: project.id });

    expect(response.status).toBe(400);
  });
});

describe('PATCH /admin/tasks/:id', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('closes a task without deleting it', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const task = await createTask({ name: 'Build' });

    const response = await request(app)
      .patch(`/admin/tasks/${task.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: TaskStatus.CLOSED });

    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe(TaskStatus.CLOSED);

    const listResponse = await request(app).get('/admin/tasks').set('Authorization', `Bearer ${tokenFor(admin)}`);
    const listed = listResponse.body.tasks.find((item: { id: string }) => item.id === task.id);
    expect(listed).toMatchObject({ id: task.id, status: TaskStatus.CLOSED });
  });

  it('returns 404 for an unknown id', async () => {
    const admin = await createUser({ role: Role.ADMIN });

    const response = await request(app)
      .patch(`/admin/tasks/${crypto.randomUUID()}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Anything' });

    expect(response.status).toBe(404);
  });
});
