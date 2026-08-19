import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { Role } from '../../generated/prisma/enums.js';
import {
  createClient,
  createProject,
  createTask,
  createTaskAssignment,
  createUser,
} from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

async function assign(user: { id: string }, ...tasks: { id: string }[]): Promise<void> {
  for (const task of tasks) {
    await createTaskAssignment({ userId: user.id, taskId: task.id });
  }
}

describe('admin employee time reports', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('lets an admin replace another employee day and writes an audit row', async () => {
    const admin = await createUser({ role: Role.ADMIN, displayName: 'Dana Admin' });
    const employee = await createUser({ role: Role.EMPLOYEE, displayName: 'Gal Employee' });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const task = await createTask({ name: 'Design', projectId: project.id });
    await assign(employee, task);

    const created = await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        startTime: '09:00',
        endTime: '18:00',
        rows: [
          {
            workLocation: 'OFFICE',
            clientId: client.id,
            projectId: project.id,
            taskId: task.id,
            hours: 9,
            description: 'Original',
          },
        ],
      });
    expect(created.status).toBe(201);
    expect(await prisma.timeReportAudit.count()).toBe(0);

    const replaced = await request(app)
      .post('/admin/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        userId: employee.id,
        date: '2026-08-16',
        startTime: '09:00',
        endTime: '18:00',
        reason: 'Corrected hours after close',
        rows: [
          {
            workLocation: 'HOME',
            clientId: client.id,
            projectId: project.id,
            taskId: task.id,
            hours: 8,
            description: 'Fixed',
          },
        ],
      });

    expect(replaced.status).toBe(201);
    expect(replaced.body.reports).toEqual([
      expect.objectContaining({
        userId: employee.id,
        hours: 8,
        workLocation: 'HOME',
        description: 'Fixed',
      }),
    ]);

    const listed = await request(app)
      .get(`/admin/reports?userId=${employee.id}&month=8&year=2026`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(listed.status).toBe(200);
    expect(listed.body.reports).toEqual([
      expect.objectContaining({ userId: employee.id, hours: 8, description: 'Fixed' }),
    ]);

    const audits = await request(app)
      .get(`/admin/reports/audit?userId=${employee.id}&month=8&year=2026`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(audits.status).toBe(200);
    expect(audits.body.audits).toHaveLength(1);
    expect(audits.body.audits[0]).toMatchObject({
      employeeId: employee.id,
      actorId: admin.id,
      actorName: 'Dana Admin',
      date: '2026-08-16',
      action: 'REPLACED',
      reason: 'Corrected hours after close',
    });
    expect(audits.body.audits[0].previousJson).toEqual([
      expect.objectContaining({ hours: 9, description: 'Original' }),
    ]);
    expect(audits.body.audits[0].nextJson).toEqual([
      expect.objectContaining({ hours: 8, description: 'Fixed' }),
    ]);
  });

  it('lets an admin delete another employee day and records DELETED', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const employee = await createUser({ role: Role.EMPLOYEE });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const task = await createTask({ name: 'Design', projectId: project.id });
    await assign(employee, task);

    await request(app)
      .post('/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({
        date: '2026-08-16',
        startTime: '09:00',
        endTime: '18:00',
        rows: [
          {
            workLocation: 'OFFICE',
            clientId: client.id,
            projectId: project.id,
            taskId: task.id,
            hours: 9,
            description: 'Gone',
          },
        ],
      });

    const deleted = await request(app)
      .delete(`/admin/reports?userId=${employee.id}&date=2026-08-16&reason=Duplicate`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(deleted.status).toBe(204);
    expect(await prisma.timeReport.count({ where: { userId: employee.id } })).toBe(0);

    const audits = await request(app)
      .get(`/admin/reports/audit?userId=${employee.id}&month=8&year=2026`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(audits.body.audits[0]).toMatchObject({
      action: 'DELETED',
      reason: 'Duplicate',
      nextJson: null,
    });
    expect(audits.body.audits[0].previousJson).toEqual([
      expect.objectContaining({ hours: 9, description: 'Gone' }),
    ]);
  });

  it('returns the chosen employee assignment tree, not the admin own tree', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const employee = await createUser({ role: Role.EMPLOYEE });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const employeeTask = await createTask({ name: 'Design', projectId: project.id });
    const adminTask = await createTask({ name: 'Admin only', projectId: project.id });
    await assign(employee, employeeTask);
    await assign(admin, adminTask);

    const response = await request(app)
      .get(`/admin/reports/options?userId=${employee.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.clients[0].projects[0].tasks).toEqual([
      expect.objectContaining({ id: employeeTask.id, name: 'Design' }),
    ]);
  });

  it('still saves a stored row after that employee assignment is withdrawn', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const employee = await createUser({ role: Role.EMPLOYEE });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const task = await createTask({ name: 'Design', projectId: project.id });
    await assign(employee, task);

    expect(
      (
        await request(app)
          .post('/reports/batch')
          .set('Authorization', `Bearer ${tokenFor(employee)}`)
          .send({
            date: '2026-08-16',
            startTime: '09:00',
            endTime: '18:00',
            rows: [
              {
                workLocation: 'OFFICE',
                clientId: client.id,
                projectId: project.id,
                taskId: task.id,
                hours: 9,
                description: 'Kept',
              },
            ],
          })
      ).status,
    ).toBe(201);

    await prisma.taskAssignment.delete({
      where: { userId_taskId: { userId: employee.id, taskId: task.id } },
    });

    const again = await request(app)
      .post('/admin/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        userId: employee.id,
        date: '2026-08-16',
        startTime: '09:00',
        endTime: '18:00',
        rows: [
          {
            workLocation: 'OFFICE',
            clientId: client.id,
            projectId: project.id,
            taskId: task.id,
            hours: 8,
            description: 'Corrected',
          },
        ],
      });

    expect(again.status).toBe(201);
    expect(again.body.reports[0]).toMatchObject({ hours: 8, description: 'Corrected' });
  });

  it('rejects a non-admin caller with 403 and writes no audit', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const response = await request(app)
      .get(`/admin/reports?userId=${employee.id}&month=8&year=2026`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(403);
    expect(await prisma.timeReportAudit.count()).toBe(0);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const response = await request(app).get(
      '/admin/reports?userId=00000000-0000-4000-8000-000000000001&month=8&year=2026',
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when the named employee does not exist', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const response = await request(app)
      .get('/admin/reports?userId=00000000-0000-4000-8000-000000000001&month=8&year=2026')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(response.status).toBe(404);
  });

  it('still replaces a locked month for an employee and writes an audit row', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const employee = await createUser({ role: Role.EMPLOYEE });
    const client = await createClient({ name: 'Acme' });
    const project = await createProject({ name: 'Website', clientId: client.id });
    const task = await createTask({ name: 'Design', projectId: project.id });
    await assign(employee, task);
    await prisma.monthLock.create({ data: { year: 2026, month: 8, lockedById: admin.id } });

    const response = await request(app)
      .post('/admin/reports/batch')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        userId: employee.id,
        date: '2026-08-16',
        startTime: '09:00',
        endTime: '18:00',
        reason: 'Month already closed',
        rows: [
          {
            workLocation: 'OFFICE',
            clientId: client.id,
            projectId: project.id,
            taskId: task.id,
            hours: 9,
            description: 'Admin correction',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.reports[0]).toMatchObject({ userId: employee.id, hours: 9 });
    expect(await prisma.timeReportAudit.count()).toBe(1);
  });
});
