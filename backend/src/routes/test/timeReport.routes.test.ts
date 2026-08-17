import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { openApiSpec } from '../../config/swagger.js';
import { prisma } from '../../config/prisma.js';
import { Role } from '../../generated/prisma/enums.js';
import { createClient, createProject, createTask, createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('POST /reports', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('creates a report for the authenticated employee and persists every field', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const task = await createTask({ name: 'Design', projectId: project.id });

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        clientId: client.id,
        projectId: project.id,
        taskId: task.id,
        description: 'Built the form',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      userId: employee.id,
      clientId: client.id,
      projectId: project.id,
      taskId: task.id,
      date: '2026-08-16',
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      description: 'Built the form',
    });
    expect(response.body.id).toEqual(expect.any(String));

    const row = await prisma.timeReport.findFirst({ where: { id: response.body.id } });
    expect(row).not.toBeNull();
    expect(row?.userId).toBe(employee.id);
  });

  it('rejects an unauthenticated caller with 401 and creates no row', async () => {
    const response = await request(app).post('/reports').send({
      date: '2026-08-16',
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '18:00',
      clientId: '00000000-0000-4000-8000-000000000001',
      projectId: '00000000-0000-4000-8000-000000000002',
      taskId: '00000000-0000-4000-8000-000000000003',
      description: 'Nope',
    });

    expect(response.status).toBe(401);
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects a missing description with 400 and creates no row', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'HOME',
        startTime: '09:00',
        endTime: '12:00',
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details.some((d: { field: string }) => d.field === 'description')).toBe(true);
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects end time before start time with 400', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'CLIENT',
        startTime: '18:00',
        endTime: '09:00',
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'Backwards',
      });

    expect(response.status).toBe(400);
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects a task that does not belong to the given project with 400', async () => {
    const employee = await createUser();
    const task = await createTask();
    const otherProject = await createProject({ name: 'Other' });
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        clientId: project.clientId,
        projectId: otherProject.id,
        taskId: task.id,
        description: 'Mismatch',
      });

    expect(response.status).toBe(400);
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects an inactive task with 400', async () => {
    const employee = await createUser();
    const task = await createTask({ isActive: false });
    const project = await prisma.project.findFirstOrThrow({
      where: { id: task.projectId },
    });

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'Inactive task',
      });

    expect(response.status).toBe(400);
    expect(await prisma.timeReport.count()).toBe(0);
  });
});

describe('OpenAPI for time reports', () => {
  it('documents POST /reports and GET /me/reporting-options', () => {
    const spec = openApiSpec as { paths?: Record<string, { post?: unknown; get?: unknown }> };
    expect(spec.paths?.['/reports']).toHaveProperty('post');
    expect(spec.paths?.['/me/reporting-options']).toHaveProperty('get');
  });
});

describe('GET /me/reporting-options', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('returns the nested active tree sorted by name', async () => {
    const employee = await createUser();
    const zebra = await createClient({ name: 'זברה' });
    const acme = await createClient({ name: 'Acme' });
    const acmeProject = await createProject({ name: 'Website', clientId: acme.id });
    await createTask({ name: 'QA', projectId: acmeProject.id });
    await createTask({ name: 'Design', projectId: acmeProject.id });
    const zebraProject = await createProject({ name: 'App', clientId: zebra.id });
    await createTask({ name: 'Build', projectId: zebraProject.id });
    const emptyClient = await createClient({ name: 'Empty' });
    await createProject({ name: 'No tasks', clientId: emptyClient.id });
    await createClient({ name: 'Inactive', isActive: false });

    const response = await request(app)
      .get('/me/reporting-options')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(200);
    expect(response.body.clients.map((c: { name: string }) => c.name)).toEqual(['Acme', 'זברה']);
    expect(response.body.clients[0].projects[0].tasks.map((t: { name: string }) => t.name)).toEqual([
      'Design',
      'QA',
    ]);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const response = await request(app).get('/me/reporting-options');
    expect(response.status).toBe(401);
  });
});
