import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { openApiSpec } from '../../config/swagger.js';
import { prisma } from '../../config/prisma.js';
import { reportWriteRateLimitStore } from '../../middleware/writeRateLimit.middleware.js';
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

describe('POST /reports/batch', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  async function aHierarchy() {
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const task = await createTask({ name: 'Design', projectId: project.id });
    return { client, project, task };
  }

  function rowFor(
    { client, project, task }: Awaited<ReturnType<typeof aHierarchy>>,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      workLocation: 'OFFICE',
      startTime: '09:00',
      endTime: '13:00',
      clientId: client.id,
      projectId: project.id,
      taskId: task.id,
      description: 'Morning',
      ...overrides,
    };
  }

  it('creates every row of the day and stamps them with the caller and date', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const first = await aHierarchy();
    const secondClient = await createClient({ name: 'Globaly' });
    const secondProject = await createProject({ name: 'App', clientId: secondClient.id });
    const secondTask = await createTask({ name: 'Build', projectId: secondProject.id });

    const response = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-17',
        rows: [
          rowFor(first),
          {
            workLocation: 'HOME',
            startTime: '13:00',
            endTime: '18:00',
            clientId: secondClient.id,
            projectId: secondProject.id,
            taskId: secondTask.id,
            description: 'Afternoon',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.reports).toHaveLength(2);
    expect(response.body.reports[0]).toMatchObject({
      userId: employee.id,
      taskId: first.task.id,
      date: '2026-08-17',
      startTime: '09:00',
      endTime: '13:00',
    });
    expect(response.body.reports[1]).toMatchObject({ taskId: secondTask.id, workLocation: 'HOME' });
    expect(await prisma.timeReport.count()).toBe(2);
  });

  it('stores a row without a description', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy();

    const response = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ date: '2026-08-17', rows: [rowFor(hierarchy, { description: undefined })] });

    expect(response.status).toBe(201);
    expect(response.body.reports[0].description).toBe('');
  });

  it('rejects an unauthenticated caller with 401 and creates no row', async () => {
    const response = await request(app)
      .post('/reports/batch')
      .send({ date: '2026-08-17', rows: [] });

    expect(response.status).toBe(401);
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects a day with no rows', async () => {
    const employee = await createUser();

    const response = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ date: '2026-08-17', rows: [] });

    expect(response.status).toBe(400);
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rolls back the whole day when one row has a broken hierarchy', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy();
    const otherProject = await createProject({ name: 'Other' });

    const response = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-17',
        rows: [rowFor(hierarchy), rowFor(hierarchy, { projectId: otherProject.id })],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'rows.1.taskId' }),
    );
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('names the row whose end time precedes its start time', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy();

    const response = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-17',
        rows: [rowFor(hierarchy), rowFor(hierarchy, { startTime: '18:00', endTime: '09:00' })],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'rows.1.endTime' }),
    );
    expect(await prisma.timeReport.count()).toBe(0);
  });
});

describe('report write rate limiting', () => {
  const MAX = env.RATE_LIMIT_WRITE_MAX_REQUESTS;

  beforeEach(async () => {
    await reportWriteRateLimitStore.resetAll();
  });

  afterEach(async () => {
    await reportWriteRateLimitStore.resetAll();
    await resetDatabase();
  });

  function exhaustQuota(token: string): Promise<unknown[]> {
    // A malformed body is enough to spend quota: the limiter sits ahead of
    // validation precisely so a caller cannot hammer the route for free.
    return Promise.all(
      Array.from({ length: MAX }, () =>
        request(app)
          .post('/reports/batch')
          .set('Authorization', `Bearer ${token}`)
          .send({ date: '2026-08-17', rows: [] })
          .expect(400),
      ),
    );
  }

  it('answers 429 with Retry-After once a caller passes the write quota', async () => {
    const employee = await createUser();
    const token = tokenFor(employee);
    await exhaustQuota(token);

    const throttled = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-08-17', rows: [] });

    expect(throttled.status).toBe(429);
    expect(Number(throttled.headers['retry-after'])).toBeGreaterThan(0);
    expect(throttled.body).toEqual({
      error: { code: 'TOO_MANY_REQUESTS', message: expect.any(String) },
    });
  });

  it('counts one caller at a time, so a throttled employee does not block a colleague', async () => {
    const throttledEmployee = await createUser({ email: 'quota-spender@example.test' });
    const colleague = await createUser({ email: 'quota-bystander@example.test' });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const task = await createTask({ name: 'Design', projectId: project.id });
    await exhaustQuota(tokenFor(throttledEmployee));

    const response = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(colleague)}`)
      .send({
        date: '2026-08-17',
        rows: [
          {
            workLocation: 'OFFICE',
            startTime: '09:00',
            endTime: '13:00',
            clientId: client.id,
            projectId: project.id,
            taskId: task.id,
            description: 'Morning',
          },
        ],
      });

    expect(response.status).toBe(201);
  });

  it('throttles the single-row route on the same quota', async () => {
    const employee = await createUser();
    const token = tokenFor(employee);
    await exhaustQuota(token);

    const throttled = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-08-17' });

    expect(throttled.status).toBe(429);
  });
});

describe('OpenAPI for time reports', () => {
  it('documents POST /reports, POST /reports/batch and GET /me/reporting-options', () => {
    const spec = openApiSpec as { paths?: Record<string, { post?: unknown; get?: unknown }> };
    expect(spec.paths?.['/reports']).toHaveProperty('post');
    expect(spec.paths?.['/reports/batch']).toHaveProperty('post');
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
