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
import { ReportFormat, Role } from '../../generated/prisma/enums.js';
import {
  createClient,
  createProject,
  createTask,
  createTaskAssignment,
  createTimeReport,
  createUser,
} from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Reporting is only allowed against a task the caller is assigned to, so every
 * test that expects a write to land has to hand out that assignment first.
 */
async function assign(user: { id: string }, ...tasks: { id: string }[]): Promise<void> {
  for (const task of tasks) {
    await createTaskAssignment({ userId: user.id, taskId: task.id });
  }
}

async function unassign(user: { id: string }, task: { id: string }): Promise<void> {
  await prisma.taskAssignment.delete({
    where: { userId_taskId: { userId: user.id, taskId: task.id } },
  });
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
    await assign(employee, task);

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

  it('stores a row without a description', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });
    await assign(employee, task);

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

    expect(response.status).toBe(201);
    expect(response.body.description).toBe('');
    expect(await prisma.timeReport.count()).toBe(1);
  });

  it('accepts an overnight window when hours fit', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });
    await assign(employee, task);

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

  it('accepts zero hours when they fit the attendance window', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });
    await assign(employee, task);

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '16:02',
        endTime: '16:02',
        hours: 0,
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: '',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ startTime: '16:02', endTime: '16:02', hours: 0 });
  });

  it('rejects hours that have more than one decimal place', async () => {
    const employee = await createUser();
    const task = await createTask();
    const project = await prisma.project.findFirstOrThrow({ where: { id: task.projectId } });
    await assign(employee, task);

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
    await assign(employee, task);

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
    await assign(employee, task);

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
    await assign(employee, task);

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

  it('creates a clock-in/out report from its own times and derives the hours', async () => {
    const employee = await createUser();
    const project = await createProject({ reportFormat: ReportFormat.CLOCK_IN_OUT });
    const task = await createTask({ projectId: project.id });
    await assign(employee, task);

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        rowStartTime: '09:00',
        rowEndTime: '13:00',
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'Clocked in',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      startTime: '09:00',
      endTime: '18:00',
      rowStartTime: '09:00',
      rowEndTime: '13:00',
      hours: 4,
    });
  });

  it('rejects hours sent for a clock-in/out project with 400 and creates no row', async () => {
    const employee = await createUser();
    const project = await createProject({ reportFormat: ReportFormat.CLOCK_IN_OUT });
    const task = await createTask({ projectId: project.id });
    await assign(employee, task);

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        hours: 4,
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'Typed instead of clocked',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toContainEqual(expect.objectContaining({ field: 'hours' }));
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects row times sent for a sum-hours project with 400 and creates no row', async () => {
    const employee = await createUser();
    const project = await createProject({ reportFormat: ReportFormat.SUM_HOURS });
    const task = await createTask({ projectId: project.id });
    await assign(employee, task);

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        rowStartTime: '09:00',
        rowEndTime: '13:00',
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'Clocked instead of typed',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'rowStartTime' }),
    );
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('stores a sum-hours report with no row times of its own', async () => {
    const employee = await createUser();
    const project = await createProject({ reportFormat: ReportFormat.SUM_HOURS });
    const task = await createTask({ projectId: project.id });
    await assign(employee, task);

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        hours: 4,
        clientId: project.clientId,
        projectId: project.id,
        taskId: task.id,
        description: 'Typed hours',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ hours: 4, rowStartTime: null, rowEndTime: null });
  });
});

describe('POST /reports/batch', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  async function aHierarchy(user: { id: string }) {
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const task = await createTask({ name: 'Design', projectId: project.id });
    await assign(user, task);
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
    const first = await aHierarchy(employee);
    const secondClient = await createClient({ name: 'Globaly' });
    const secondProject = await createProject({ name: 'App', clientId: secondClient.id });
    const secondTask = await createTask({ name: 'Build', projectId: secondProject.id });
    await assign(employee, secondTask);

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
    const hierarchy = await aHierarchy(employee);

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
    const hierarchy = await aHierarchy(employee);
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
    const hierarchy = await aHierarchy(employee);

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
    const hierarchy = await aHierarchy(employee);
    await assign(other, hierarchy.task);
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
    const hierarchy = await aHierarchy(employee);
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

describe('POST /reports/batch with format-aware rows', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  async function aHierarchy(reportFormat: ReportFormat, user: { id: string }) {
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id, reportFormat });
    const task = await createTask({ name: 'Design', projectId: project.id });
    await assign(user, task);
    return { client, project, task };
  }

  function rowFor(
    { client, project, task }: Awaited<ReturnType<typeof aHierarchy>>,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      workLocation: 'OFFICE',
      clientId: client.id,
      projectId: project.id,
      taskId: task.id,
      description: 'Row',
      ...overrides,
    };
  }

  function dayBody(
    rows: Record<string, unknown>[],
    window: { startTime: string; endTime: string } = { startTime: '09:00', endTime: '18:00' },
  ) {
    return { date: '2026-08-17', ...window, rows };
  }

  function postDay(token: string, body: Record<string, unknown>) {
    return request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function fieldsOf(response: { body: { error: { details: { field: string }[] } } }): string[] {
    return response.body.error.details.map((detail) => detail.field);
  }

  it('accepts a clock-in/out row carrying its own times and persists them', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(hierarchy, { rowStartTime: '10:00', rowEndTime: '13:00' })]),
    );

    expect(response.status).toBe(201);
    expect(response.body.reports[0]).toMatchObject({
      startTime: '09:00',
      endTime: '18:00',
      rowStartTime: '10:00',
      rowEndTime: '13:00',
      hours: 3,
    });
    expect(await prisma.timeReport.count()).toBe(1);
  });

  it('rejects a clock-in/out row that carries hours instead of times', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(tokenFor(employee), dayBody([rowFor(hierarchy, { hours: 4 })]));

    expect(response.status).toBe(400);
    expect(fieldsOf(response)).toContain('rows.0.hours');
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects a sum-hours row that carries row times instead of hours', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.SUM_HOURS, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(hierarchy, { rowStartTime: '09:00', rowEndTime: '13:00' })]),
    );

    expect(response.status).toBe(400);
    expect(fieldsOf(response)).toContain('rows.0.rowStartTime');
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('persists a day mixing a sum-hours row and a clock-in/out row', async () => {
    const employee = await createUser();
    const typed = await aHierarchy(ReportFormat.SUM_HOURS, employee);
    const clocked = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([
        rowFor(typed, { hours: 3, description: 'Typed' }),
        rowFor(clocked, { rowStartTime: '14:00', rowEndTime: '18:00', description: 'Clocked' }),
      ]),
    );

    expect(response.status).toBe(201);
    expect(response.body.reports).toHaveLength(2);
    expect(response.body.reports[0]).toMatchObject({
      hours: 3,
      rowStartTime: null,
      rowEndTime: null,
    });
    expect(response.body.reports[1]).toMatchObject({
      hours: 4,
      rowStartTime: '14:00',
      rowEndTime: '18:00',
    });
    expect(await prisma.timeReport.count()).toBe(2);
  });

  it('rejects a row that starts before the day window and stores nothing', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(hierarchy, { rowStartTime: '08:00', rowEndTime: '13:00' })]),
    );

    expect(response.status).toBe(400);
    expect(fieldsOf(response)).toContain('rows.0.rowStartTime');
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects a row that ends after the day window and stores nothing', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(hierarchy, { rowStartTime: '16:00', rowEndTime: '19:00' })]),
    );

    expect(response.status).toBe(400);
    expect(fieldsOf(response)).toContain('rows.0.rowEndTime');
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('accepts a row spanning the whole day window', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(hierarchy, { rowStartTime: '09:00', rowEndTime: '18:00' })]),
    );

    expect(response.status).toBe(201);
    expect(response.body.reports[0]).toMatchObject({ hours: 9 });
  });

  it('accepts a row inside an overnight window without reading it as backwards', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(hierarchy, { rowStartTime: '23:00', rowEndTime: '02:00' })], {
        startTime: '22:00',
        endTime: '06:00',
      }),
    );

    expect(response.status).toBe(201);
    expect(response.body.reports[0]).toMatchObject({
      rowStartTime: '23:00',
      rowEndTime: '02:00',
      hours: 3,
    });
  });

  it('rejects a zero-length row and stores nothing', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(hierarchy, { rowStartTime: '10:00', rowEndTime: '10:00' })]),
    );

    expect(response.status).toBe(400);
    expect(fieldsOf(response)).toContain('rows.0.rowEndTime');
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('rejects overlapping clock-in/out rows naming every clashing row', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([
        rowFor(hierarchy, { rowStartTime: '09:00', rowEndTime: '13:00' }),
        rowFor(hierarchy, { rowStartTime: '12:00', rowEndTime: '17:00' }),
      ]),
    );

    expect(response.status).toBe(400);
    expect(fieldsOf(response)).toEqual(
      expect.arrayContaining(['rows.0.rowStartTime', 'rows.1.rowStartTime']),
    );
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('accepts clock-in/out rows that only touch at an endpoint', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([
        rowFor(hierarchy, { rowStartTime: '09:00', rowEndTime: '13:00' }),
        rowFor(hierarchy, { rowStartTime: '13:00', rowEndTime: '17:00' }),
      ]),
    );

    expect(response.status).toBe(201);
    expect(response.body.reports).toHaveLength(2);
    expect(await prisma.timeReport.count()).toBe(2);
  });

  it('rejects a clock-in/out row fully containing another', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([
        rowFor(hierarchy, { rowStartTime: '09:00', rowEndTime: '17:00' }),
        rowFor(hierarchy, { rowStartTime: '10:00', rowEndTime: '12:00' }),
      ]),
    );

    expect(response.status).toBe(400);
    expect(fieldsOf(response)).toEqual(
      expect.arrayContaining(['rows.0.rowStartTime', 'rows.1.rowStartTime']),
    );
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('never raises an overlap error for sum-hours rows, which have no interval', async () => {
    const employee = await createUser();
    const typed = await aHierarchy(ReportFormat.SUM_HOURS, employee);
    const clocked = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([
        rowFor(clocked, { rowStartTime: '09:00', rowEndTime: '13:00' }),
        rowFor(typed, { hours: 2 }),
        rowFor(typed, { hours: 3 }),
      ]),
    );

    expect(response.status).toBe(201);
    expect(response.body.reports).toHaveLength(3);
    expect(await prisma.timeReport.count()).toBe(3);
  });

  it('derives four hours from a four-hour interval', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(hierarchy, { rowStartTime: '09:00', rowEndTime: '13:00' })]),
    );

    expect(response.status).toBe(201);
    expect(response.body.reports[0].hours).toBe(4);
    const stored = await prisma.timeReport.findFirstOrThrow();
    expect(Number(stored.hours)).toBe(4);
  });

  it('derives 0.3 from a twenty-minute stint without applying the typed 0.5 floor', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(hierarchy, { rowStartTime: '09:00', rowEndTime: '09:20' })]),
    );

    expect(response.status).toBe(201);
    expect(response.body.reports[0].hours).toBe(0.3);
  });

  it('counts derived hours toward the attendance window total', async () => {
    const employee = await createUser();
    const clocked = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);
    const typed = await aHierarchy(ReportFormat.SUM_HOURS, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([
        rowFor(clocked, { rowStartTime: '09:00', rowEndTime: '17:00' }),
        rowFor(typed, { hours: 2 }),
      ]),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('HOURS_EXCEED_WINDOW');
    expect(await prisma.timeReport.count()).toBe(0);
  });

  // Every window above is nine hours — 540 minutes, a clean multiple of six —
  // which is exactly the shape that hides rounding drift. These use windows
  // whose minute count is 3, 4 or 5 modulo 6, where a row's rounded hours are
  // worth more minutes than the row actually spans.
  it('still rejects a day whose exact minutes exceed an odd-length window', async () => {
    const employee = await createUser();
    const clocked = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);
    const typed = await aHierarchy(ReportFormat.SUM_HOURS, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody(
        [
          rowFor(clocked, { rowStartTime: '09:00', rowEndTime: '17:45' }),
          rowFor(typed, { hours: 0.5 }),
        ],
        { startTime: '09:00', endTime: '17:45' },
      ),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('HOURS_EXCEED_WINDOW');
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('accepts the same task clocked twice in one day over disjoint stretches', async () => {
    const employee = await createUser();
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);

    const response = await postDay(
      tokenFor(employee),
      dayBody([
        rowFor(hierarchy, { rowStartTime: '09:00', rowEndTime: '11:00' }),
        rowFor(hierarchy, { rowStartTime: '14:00', rowEndTime: '16:00' }),
      ]),
    );

    expect(response.status).toBe(201);
    expect(response.body.reports).toHaveLength(2);
    expect(await prisma.timeReport.count()).toBe(2);
  });

  async function switchFormat(projectId: string, reportFormat: ReportFormat) {
    await prisma.project.update({ where: { id: projectId }, data: { reportFormat } });
  }

  it('keeps a saved clock-in/out row on its own format after the project switches to sum-hours', async () => {
    const employee = await createUser();
    const token = tokenFor(employee);
    const hierarchy = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);
    const clockRow = { rowStartTime: '10:00', rowEndTime: '13:00' };

    expect((await postDay(token, dayBody([rowFor(hierarchy, clockRow)]))).status).toBe(201);
    await switchFormat(hierarchy.project.id, ReportFormat.SUM_HOURS);

    const response = await postDay(token, dayBody([rowFor(hierarchy, clockRow)]));

    expect(response.status).toBe(201);
    expect(response.body.reports[0]).toMatchObject({
      rowStartTime: '10:00',
      rowEndTime: '13:00',
      hours: 3,
    });
    const stored = await prisma.timeReport.findFirstOrThrow();
    expect(Number(stored.hours)).toBe(3);
    expect(stored.rowStartTime).not.toBeNull();
  });

  it('keeps a saved sum-hours row on its own format after the project switches to clock-in/out', async () => {
    const employee = await createUser();
    const token = tokenFor(employee);
    const hierarchy = await aHierarchy(ReportFormat.SUM_HOURS, employee);

    expect((await postDay(token, dayBody([rowFor(hierarchy, { hours: 4 })]))).status).toBe(201);
    await switchFormat(hierarchy.project.id, ReportFormat.CLOCK_IN_OUT);

    const response = await postDay(token, dayBody([rowFor(hierarchy, { hours: 4 })]));

    expect(response.status).toBe(201);
    expect(response.body.reports[0]).toMatchObject({
      hours: 4,
      rowStartTime: null,
      rowEndTime: null,
    });
    const stored = await prisma.timeReport.findFirstOrThrow();
    expect(Number(stored.hours)).toBe(4);
    expect(stored.rowStartTime).toBeNull();
  });

  it('validates a newly added row against its project current format while a matched row keeps its stored one', async () => {
    const employee = await createUser();
    const token = tokenFor(employee);
    const saved = await aHierarchy(ReportFormat.CLOCK_IN_OUT, employee);
    const added = await aHierarchy(ReportFormat.SUM_HOURS, employee);
    const clockRow = { rowStartTime: '10:00', rowEndTime: '13:00' };

    expect((await postDay(token, dayBody([rowFor(saved, clockRow)]))).status).toBe(201);
    await switchFormat(saved.project.id, ReportFormat.SUM_HOURS);

    // The second row is new to this day, so its sum-hours project rules: a
    // clock pair there is rejected even though the first row keeps carrying one.
    const rejected = await postDay(
      token,
      dayBody([
        rowFor(saved, clockRow),
        rowFor(added, { rowStartTime: '14:00', rowEndTime: '16:00' }),
      ]),
    );

    expect(rejected.status).toBe(400);
    expect(fieldsOf(rejected)).toEqual(['rows.1.rowStartTime']);
    expect(await prisma.timeReport.count()).toBe(1);

    const accepted = await postDay(
      token,
      dayBody([rowFor(saved, clockRow), rowFor(added, { hours: 2 })]),
    );

    expect(accepted.status).toBe(201);
    expect(accepted.body.reports[0]).toMatchObject({
      rowStartTime: '10:00',
      rowEndTime: '13:00',
      hours: 3,
    });
    expect(accepted.body.reports[1]).toMatchObject({ hours: 2, rowStartTime: null });
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
    await assign(colleague, task);
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

  it('returns the nested active assigned tree sorted by name', async () => {
    const employee = await createUser();
    const zebra = await createClient({ name: 'זברה' });
    const acme = await createClient({ name: 'Acme' });
    const acmeProject = await createProject({ name: 'Website', clientId: acme.id });
    const qa = await createTask({ name: 'QA', projectId: acmeProject.id });
    const design = await createTask({ name: 'Design', projectId: acmeProject.id });
    const zebraProject = await createProject({ name: 'App', clientId: zebra.id });
    const build = await createTask({ name: 'Build', projectId: zebraProject.id });
    await assign(employee, qa, design, build);
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

  it('carries each project own report format', async () => {
    const employee = await createUser();
    const client = await createClient({ name: 'Acme' });
    const clocked = await createProject({
      name: 'Attendance',
      clientId: client.id,
      reportFormat: ReportFormat.CLOCK_IN_OUT,
    });
    const build = await createTask({ name: 'Build', projectId: clocked.id });
    const typed = await createProject({
      name: 'Billing',
      clientId: client.id,
      reportFormat: ReportFormat.SUM_HOURS,
    });
    const invoice = await createTask({ name: 'Invoice', projectId: typed.id });
    await assign(employee, build, invoice);

    const response = await request(app)
      .get('/me/reporting-options')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(200);
    expect(response.body.clients[0].projects).toEqual([
      expect.objectContaining({ name: 'Attendance', reportFormat: ReportFormat.CLOCK_IN_OUT }),
      expect.objectContaining({ name: 'Billing', reportFormat: ReportFormat.SUM_HOURS }),
    ]);
  });

  it('offers only the tasks the caller is assigned to and prunes what is left empty', async () => {
    const employee = await createUser();
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const mine = await createTask({ name: 'Design', projectId: project.id });
    await createTask({ name: 'Someone else', projectId: project.id });
    // A whole project, and a whole client, with nothing assigned on them: both
    // must disappear rather than show up as an empty branch.
    const unassignedProject = await createProject({ name: 'Backend', clientId: client.id });
    await createTask({ name: 'Migrate', projectId: unassignedProject.id });
    const otherClient = await createClient({ name: 'Globex' });
    const otherProject = await createProject({ name: 'Mobile', clientId: otherClient.id });
    await createTask({ name: 'Ship', projectId: otherProject.id });
    await assign(employee, mine);

    const response = await request(app)
      .get('/me/reporting-options')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(200);
    expect(response.body.clients).toHaveLength(1);
    expect(response.body.clients[0]).toMatchObject({ id: client.id, name: 'Acme' });
    expect(response.body.clients[0].projects).toHaveLength(1);
    expect(response.body.clients[0].projects[0]).toMatchObject({ id: project.id });
    expect(response.body.clients[0].projects[0].tasks).toEqual([{ id: mine.id, name: 'Design' }]);
  });

  it('returns no clients at all for a caller with no assignments', async () => {
    const employee = await createUser();
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    await createTask({ name: 'Design', projectId: project.id });

    const response = await request(app)
      .get('/me/reporting-options')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(200);
    expect(response.body.clients).toEqual([]);
  });

  it('scopes an admin by their own assignments exactly like an employee', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const assigned = await createTask({ name: 'Design', projectId: project.id });
    await createTask({ name: 'Not mine', projectId: project.id });
    await assign(admin, assigned);

    const response = await request(app)
      .get('/me/reporting-options')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.clients[0].projects[0].tasks).toEqual([
      { id: assigned.id, name: 'Design' },
    ]);
  });

  it('returns nothing for an admin with no assignments, with no role shortcut', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    await createTask({ name: 'Design', projectId: project.id });

    const response = await request(app)
      .get('/me/reporting-options')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.clients).toEqual([]);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const response = await request(app).get('/me/reporting-options');
    expect(response.status).toBe(401);
  });
});

describe('reporting is limited to assigned tasks', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  async function aTask(name: string) {
    const client = await createClient({ name: `Client ${name}` });
    const project = await createProject({ name: `Project ${name}`, clientId: client.id });
    const task = await createTask({ name, projectId: project.id });
    return { client, project, task };
  }

  function rowFor(
    { client, project, task }: Awaited<ReturnType<typeof aTask>>,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      workLocation: 'OFFICE',
      hours: 3,
      clientId: client.id,
      projectId: project.id,
      taskId: task.id,
      description: 'Row',
      ...overrides,
    };
  }

  function dayBody(rows: Record<string, unknown>[]) {
    return { date: '2026-08-17', startTime: '09:00', endTime: '18:00', rows };
  }

  function postDay(token: string, body: Record<string, unknown>) {
    return request(app).post('/reports/batch').set('Authorization', `Bearer ${token}`).send(body);
  }

  it('rejects a single report against a task the caller is not assigned to', async () => {
    const employee = await createUser();
    const unassigned = await aTask('Design');
    // The colleague's assignment proves the task itself is perfectly reportable
    // — it is this caller, not the task, that the check turns on.
    await assign(await createUser(), unassigned.task);

    const response = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-17',
        workLocation: 'OFFICE',
        startTime: '09:00',
        endTime: '18:00',
        hours: 3,
        clientId: unassigned.client.id,
        projectId: unassigned.project.id,
        taskId: unassigned.task.id,
        description: 'Not my task',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'taskId' }),
    );
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('names the offending row when a batch mixes an assigned and an unassigned task', async () => {
    const employee = await createUser();
    const mine = await aTask('Design');
    const theirs = await aTask('Build');
    await assign(employee, mine.task);

    const response = await postDay(
      tokenFor(employee),
      dayBody([rowFor(mine, { hours: 3 }), rowFor(theirs, { hours: 2 })]),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'rows.1.taskId' }),
    );
    expect(response.body.error.details).not.toContainEqual(
      expect.objectContaining({ field: 'rows.0.taskId' }),
    );
    expect(await prisma.timeReport.count()).toBe(0);
  });

  it('still saves a day whose task was unassigned after it was first reported', async () => {
    const employee = await createUser();
    const token = tokenFor(employee);
    const hierarchy = await aTask('Design');
    await assign(employee, hierarchy.task);

    expect((await postDay(token, dayBody([rowFor(hierarchy, { hours: 3 })]))).status).toBe(201);
    await unassign(employee, hierarchy.task);

    const again = await postDay(token, dayBody([rowFor(hierarchy, { hours: 5 })]));

    expect(again.status).toBe(201);
    expect(again.body.reports[0]).toMatchObject({ taskId: hierarchy.task.id, hours: 5 });
    expect(await prisma.timeReport.count({ where: { userId: employee.id } })).toBe(1);
  });

  it('rejects a brand-new unassigned row even when the day already holds stored rows', async () => {
    const employee = await createUser();
    const token = tokenFor(employee);
    const stored = await aTask('Design');
    const added = await aTask('Build');
    await assign(employee, stored.task);

    expect((await postDay(token, dayBody([rowFor(stored, { hours: 3 })]))).status).toBe(201);

    const response = await postDay(
      token,
      dayBody([rowFor(stored, { hours: 3 }), rowFor(added, { hours: 2 })]),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'rows.1.taskId' }),
    );
    const rows = await prisma.timeReport.findMany({ where: { userId: employee.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.taskId).toBe(stored.task.id);
  });

  it('excuses as many rows on an unassigned task as the day already stores', async () => {
    const employee = await createUser();
    const token = tokenFor(employee);
    const hierarchy = await aTask('Design');
    await assign(employee, hierarchy.task);

    expect(
      (
        await postDay(
          token,
          dayBody([rowFor(hierarchy, { hours: 3 }), rowFor(hierarchy, { hours: 2 })]),
        )
      ).status,
    ).toBe(201);
    await unassign(employee, hierarchy.task);

    const again = await postDay(
      token,
      dayBody([rowFor(hierarchy, { hours: 4 }), rowFor(hierarchy, { hours: 4 })]),
    );

    expect(again.status).toBe(201);
    expect(again.body.reports).toHaveLength(2);
  });

  it('carries the carve-out only for the same user, so a colleague is still refused', async () => {
    const employee = await createUser();
    const colleague = await createUser();
    const hierarchy = await aTask('Design');
    await assign(employee, hierarchy.task);

    expect(
      (await postDay(tokenFor(employee), dayBody([rowFor(hierarchy, { hours: 3 })]))).status,
    ).toBe(201);

    const response = await postDay(
      tokenFor(colleague),
      dayBody([rowFor(hierarchy, { hours: 3 })]),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'rows.0.taskId' }),
    );
    expect(await prisma.timeReport.count({ where: { userId: colleague.id } })).toBe(0);
  });
});
