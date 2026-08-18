import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { openApiSpec } from '../../config/swagger.js';
import { prisma } from '../../config/prisma.js';
import {
  reportReadRateLimitStore,
  reportWriteRateLimitStore,
} from '../../middleware/writeRateLimit.middleware.js';
import { Role } from '../../generated/prisma/enums.js';
import { createClient, createProject, createTask, createTimeReport, createUser } from '../../test/factories.js';
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
        hours: 9,
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
      hours: 9,
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
      hours: 9,
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
        hours: 3,
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details.some((d: { field: string }) => d.field === 'description')).toBe(true);
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('accepts an overnight window when hours fit', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'CLIENT',
        startTime: '22:00',
        endTime: '06:00',
        hours: 8,
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'Night',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ startTime: '22:00', endTime: '06:00', hours: 8 });
  });

  it('rejects hours of 0', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        hours: 0,
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'Zero',
      });

    expect(response.status).toBe(400);
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects hours that have more than one decimal place', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        hours: 3.34,
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'Uneven',
      });

    expect(response.status).toBe(400);
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('accepts hours with a single decimal place', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        hours: 3.3,
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'One decimal',
      });

    expect(response.status).toBe(201);
    expect(response.body.hours).toBe(3.3);
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
        hours: 9,
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
        hours: 9,
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
      hours: 4,
      clientId: client.id,
      projectId: project.id,
      taskId: task.id,
      description: 'Morning',
      ...overrides,
    };
  }

  function dayBody(rows: Record<string, unknown>[]) {
    return { date: '2026-08-17', startTime: '09:00', endTime: '18:00', rows };
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
      .send(
        dayBody([
          rowFor(first, { hours: 4 }),
          {
            workLocation: 'HOME',
            hours: 3,
            clientId: secondClient.id,
            projectId: secondProject.id,
            taskId: secondTask.id,
            description: 'Afternoon',
          },
        ]),
      );

    expect(response.status).toBe(201);
    expect(response.body.reports).toHaveLength(2);
    expect(response.body.reports[0]).toMatchObject({
      userId: employee.id,
      taskId: first.task.id,
      date: '2026-08-17',
      startTime: '09:00',
      endTime: '18:00',
      hours: 4,
    });
    expect(response.body.reports[1]).toMatchObject({
      taskId: secondTask.id,
      workLocation: 'HOME',
      hours: 3,
      startTime: '09:00',
      endTime: '18:00',
    });
    expect(await prisma.timeReport.count()).toBe(2);
  });

  it('stores a row without a description', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy();

    const response = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send(dayBody([rowFor(hierarchy, { description: undefined })]));

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
      .send(dayBody([rowFor(hierarchy), rowFor(hierarchy, { projectId: otherProject.id })]));

    expect(response.status).toBe(400);
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'rows.1.taskId' }),
    );
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects a batch whose hours exceed the attendance window', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy();

    const response = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send(dayBody([rowFor(hierarchy, { hours: 4 }), rowFor(hierarchy, { hours: 6 })]));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('HOURS_EXCEED_WINDOW');
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('replaces the caller\'s previous rows for that date instead of appending', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const other = await createUser({ role: Role.EMPLOYEE });
    const hierarchy = await aHierarchy();
    const token = tokenFor(employee);

    await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${token}`)
      .send(dayBody([rowFor(hierarchy, { hours: 4 }), rowFor(hierarchy, { hours: 3, description: 'Second' })]))
      .expect(201);

    await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(other)}`)
      .send(dayBody([rowFor(hierarchy, { hours: 2, description: 'Other user' })]))
      .expect(201);

    const again = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${token}`)
      .send(dayBody([rowFor(hierarchy, { hours: 5, description: 'Kept' })]));

    expect(again.status).toBe(201);
    expect(again.body.reports).toHaveLength(1);
    expect(again.body.reports[0]).toMatchObject({ hours: 5, description: 'Kept' });

    const mine = await prisma.timeReport.findMany({ where: { userId: employee.id } });
    expect(mine).toHaveLength(1);
    expect(Number(mine[0]?.hours)).toBe(5);

    expect(await prisma.timeReport.count({ where: { userId: other.id } })).toBe(1);
  });

  it('keeps the previous day when a replacement batch is invalid', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const hierarchy = await aHierarchy();
    const token = tokenFor(employee);

    await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${token}`)
      .send(dayBody([rowFor(hierarchy, { hours: 4 })]))
      .expect(201);

    const failed = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${token}`)
      .send(dayBody([rowFor(hierarchy, { hours: 10 })]));

    expect(failed.status).toBe(400);
    expect(await prisma.timeReport.count({ where: { userId: employee.id } })).toBe(1);
    expect(Number((await prisma.timeReport.findFirst({ where: { userId: employee.id } }))?.hours)).toBe(4);
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
        startTime: '09:00',
        endTime: '18:00',
        rows: [
          {
            workLocation: 'OFFICE',
            hours: 4,
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

describe('GET /reports', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('returns the caller rows for the requested month with names and duration', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const other = await createUser({ role: Role.EMPLOYEE });
    const client = await createClient({ name: 'Globex' });
    const project = await createProject({ name: 'Mobile app', clientId: client.id });
    const task = await createTask({ name: 'QA', projectId: project.id });

    await prisma.timeReport.create({
      data: {
        userId: employee.id,
        clientId: client.id,
        projectId: project.id,
        taskId: task.id,
        date: new Date('2026-08-17T00:00:00.000Z'),
        workLocation: 'CLIENT',
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T18:00:00.000Z'),
        hours: 9,
        description: 'Manual test',
      },
    });
    await prisma.timeReport.create({
      data: {
        userId: other.id,
        clientId: client.id,
        projectId: project.id,
        taskId: task.id,
        date: new Date('2026-08-17T00:00:00.000Z'),
        workLocation: 'OFFICE',
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T12:00:00.000Z'),
        hours: 3,
        description: 'Not mine',
      },
    });
    await prisma.timeReport.create({
      data: {
        userId: employee.id,
        clientId: client.id,
        projectId: project.id,
        taskId: task.id,
        date: new Date('2026-07-31T00:00:00.000Z'),
        workLocation: 'HOME',
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T10:00:00.000Z'),
        hours: 1,
        description: 'Previous month',
      },
    });

    const response = await request(app)
      .get('/reports')
      .query({ month: 8, year: 2026 })
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(200);
    expect(response.body.reports).toHaveLength(1);
    expect(response.body.reports[0]).toMatchObject({
      userId: employee.id,
      date: '2026-08-17',
      clientName: 'Globex',
      projectName: 'Mobile app',
      taskName: 'QA',
      durationHours: 9,
      description: 'Manual test',
    });
  });

  it('rejects missing month or year with 400', async () => {
    const employee = await createUser();

    const response = await request(app)
      .get('/reports')
      .query({ year: 2026 })
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(400);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const response = await request(app).get('/reports').query({ month: 8, year: 2026 });

    expect(response.status).toBe(401);
  });
});

describe('DELETE /reports', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('deletes every row the caller saved on that date and leaves other days and users', async () => {
    const employee = await createUser();
    const other = await createUser();
    const keep = await createTimeReport({
      userId: employee.id,
      date: new Date('2026-08-16T00:00:00.000Z'),
    });
    await createTimeReport({
      userId: employee.id,
      date: new Date('2026-08-17T00:00:00.000Z'),
    });
    await createTimeReport({
      userId: employee.id,
      date: new Date('2026-08-17T00:00:00.000Z'),
    });
    const colleague = await createTimeReport({
      userId: other.id,
      date: new Date('2026-08-17T00:00:00.000Z'),
    });

    const response = await request(app)
      .delete('/reports')
      .query({ date: '2026-08-17' })
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(204);
    expect(await prisma.timeReport.count({ where: { userId: employee.id } })).toBe(1);
    expect(await prisma.timeReport.findFirst({ where: { id: keep.id } })).not.toBeNull();
    expect(await prisma.timeReport.findFirst({ where: { id: colleague.id } })).not.toBeNull();
  });

  it('rejects a date with no rows for the caller with 404', async () => {
    const employee = await createUser();
    await createTimeReport({
      userId: employee.id,
      date: new Date('2026-08-16T00:00:00.000Z'),
    });

    const response = await request(app)
      .delete('/reports')
      .query({ date: '2026-08-17' })
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(404);
    expect(await prisma.timeReport.count()).toBe(1);
  });

  it('rejects a malformed date with 400', async () => {
    const employee = await createUser();

    const response = await request(app)
      .delete('/reports')
      .query({ date: '17-08-2026' })
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(400);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const response = await request(app).delete('/reports').query({ date: '2026-08-17' });

    expect(response.status).toBe(401);
  });
});

describe('report read rate limiting', () => {
  const MAX = env.RATE_LIMIT_READ_MAX_REQUESTS;

  beforeEach(async () => {
    await reportReadRateLimitStore.resetAll();
  });

  afterEach(async () => {
    await reportReadRateLimitStore.resetAll();
    await resetDatabase();
  });

  it('answers 429 with Retry-After once an address passes the read quota', async () => {
    // Sent without a token on purpose: the limiter sits ahead of `authenticate`
    // so the token verify and user-row read that middleware performs are
    // themselves capped, which means even rejected reads spend quota. Issued in
    // batches rather than one Promise.all over the whole quota to keep the
    // number of concurrent sockets bounded.
    for (let sent = 0; sent < MAX; sent += 60) {
      const batch = Math.min(60, MAX - sent);
      await Promise.all(
        Array.from({ length: batch }, () => request(app).get('/reports').expect(401)),
      );
    }

    const throttled = await request(app).get('/reports').query({ month: 8, year: 2026 });

    expect(throttled.status).toBe(429);
    expect(Number(throttled.headers['retry-after'])).toBeGreaterThan(0);
    expect(throttled.body).toEqual({
      error: { code: 'TOO_MANY_REQUESTS', message: expect.any(String) },
    });
  });
});

describe('OpenAPI for time reports', () => {
  it('documents POST /reports, POST /reports/batch and GET /me/reporting-options', () => {
    const spec = openApiSpec as { paths?: Record<string, { post?: unknown; get?: unknown; delete?: unknown }> };
    expect(spec.paths?.['/reports']).toHaveProperty('post');
    expect(spec.paths?.['/reports']).toHaveProperty('get');
    expect(spec.paths?.['/reports']).toHaveProperty('delete');
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
