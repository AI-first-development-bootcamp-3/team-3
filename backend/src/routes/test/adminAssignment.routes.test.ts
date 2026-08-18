import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { Role, TaskStatus } from '../../generated/prisma/enums.js';
import { createClient, createProject, createTask, createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /admin/assignments', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('lists open tasks with assigned workers', async () => {
    const admin = await createUser({ role: Role.ADMIN, displayName: 'Admin' });
    const worker = await createUser({ displayName: 'Dana' });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Atlas', clientId: client.id });
    const task = await createTask({ name: 'Build', projectId: project.id });
    await prisma.taskAssignment.create({ data: { userId: worker.id, taskId: task.id } });

    const response = await request(app).get('/admin/assignments').set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.assignments).toHaveLength(1);
    expect(response.body.assignments[0]).toMatchObject({
      taskId: task.id,
      taskName: 'Build',
      projectName: 'Atlas',
      clientName: 'Acme',
    });
    expect(response.body.assignments[0].workers).toEqual([{ userId: worker.id, displayName: 'Dana' }]);
  });

  it('omits closed tasks and inactive parents', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const client = await createClient({ name: 'Acme' });
    const liveProject = await createProject({ name: 'Live', clientId: client.id });
    const deadProject = await createProject({ name: 'Dead', clientId: client.id, isActive: false });
    await createTask({ name: 'Closed', projectId: liveProject.id, status: TaskStatus.CLOSED });
    await createTask({ name: 'Orphan', projectId: deadProject.id });
    await createTask({ name: 'Open', projectId: liveProject.id });

    const response = await request(app).get('/admin/assignments').set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.assignments.map((row: { taskName: string }) => row.taskName)).toEqual(['Open']);
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const response = await request(app).get('/admin/assignments').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(response.status).toBe(403);
  });
});

describe('POST /admin/assignments', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('assigns users onto an open task', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const worker = await createUser({ displayName: 'Dana' });
    const task = await createTask({ name: 'Build' });

    const response = await request(app)
      .post('/admin/assignments')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ taskId: task.id, userIds: [worker.id] });

    expect(response.status).toBe(201);
    expect(response.body.assignment.workers).toEqual([{ userId: worker.id, displayName: 'Dana' }]);
  });

  it('rejects assigning to a closed task with 404', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const worker = await createUser();
    const task = await createTask({ status: TaskStatus.CLOSED });

    const response = await request(app)
      .post('/admin/assignments')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ taskId: task.id, userIds: [worker.id] });

    expect(response.status).toBe(404);
  });

  it('rejects unknown users with 400', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const task = await createTask();

    const response = await request(app)
      .post('/admin/assignments')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ taskId: task.id, userIds: ['00000000-0000-4000-8000-000000000000'] });

    expect(response.status).toBe(400);
  });
});

describe('DELETE /admin/assignments', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('removes one assignment', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const worker = await createUser();
    const task = await createTask();
    await prisma.taskAssignment.create({ data: { userId: worker.id, taskId: task.id } });

    const response = await request(app)
      .delete('/admin/assignments')
      .query({ taskId: task.id, userId: worker.id })
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(204);

    const remaining = await prisma.taskAssignment.findMany({ where: { taskId: task.id } });
    expect(remaining).toHaveLength(0);
  });

  it('returns 404 when the assignment does not exist', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const worker = await createUser();
    const task = await createTask();

    const response = await request(app)
      .delete('/admin/assignments')
      .query({ taskId: task.id, userId: worker.id })
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(404);
  });
});
