import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { Role } from '../../generated/prisma/enums.js';
import { triggerWorkClockEodAutoStop } from '../../jobs/workClockEod.job.js';
import {
  assignTask,
  createAbsence,
  createClient,
  createProject,
  createTask,
  createUser,
} from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

async function seedAssignedEmployee() {
  const employee = await createUser({ role: Role.EMPLOYEE });
  const client = await createClient({ name: 'Acme' });
  const project = await createProject({ name: 'Web', clientId: client.id });
  const task = await createTask({ name: 'Design', projectId: project.id });
  await assignTask(employee.id, task.id);
  return { employee, client, project, task };
}

describe('Work clock API', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('starts, stops, and discards a session', async () => {
    const { employee } = await seedAssignedEmployee();
    const auth = `Bearer ${tokenFor(employee)}`;

    const start = await request(app).post('/me/clock/start').set('Authorization', auth);
    expect(start.status).toBe(201);
    expect(start.body.session.status).toBe('ACTIVE');

    const active = await request(app).get('/me/clock/session').set('Authorization', auth);
    expect(active.status).toBe(200);
    expect(active.body.session.sessionId).toBe(start.body.session.sessionId);

    const stop = await request(app).post('/me/clock/stop').set('Authorization', auth);
    expect(stop.status).toBe(200);
    expect(stop.body.session.status).toBe('AWAITING_CONFIRM');
    expect(stop.body.session.segments.length).toBeGreaterThan(0);

    const discard = await request(app).post('/me/clock/discard').set('Authorization', auth);
    expect(discard.status).toBe(204);

    const cleared = await request(app).get('/me/clock/session').set('Authorization', auth);
    expect(cleared.body.session).toBeNull();
  });

  it('blocks start without assignments', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const response = await request(app)
      .post('/me/clock/start')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(response.status).toBe(409);
  });

  it('blocks start on full-day absence', async () => {
    const { employee } = await seedAssignedEmployee();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    await createAbsence({
      userId: employee.id,
      startDate: new Date(`${today}T00:00:00.000Z`),
      endDate: new Date(`${today}T00:00:00.000Z`),
      halfDay: false,
    });

    const response = await request(app)
      .post('/me/clock/start')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(response.status).toBe(409);
  });

  it('blocks second start while session open', async () => {
    const { employee } = await seedAssignedEmployee();
    const auth = `Bearer ${tokenFor(employee)}`;
    await request(app).post('/me/clock/start').set('Authorization', auth);
    const second = await request(app).post('/me/clock/start').set('Authorization', auth);
    expect(second.status).toBe(409);
  });

  it('auto-stops active sessions via EOD job hook', async () => {
    const { employee } = await seedAssignedEmployee();
    const auth = `Bearer ${tokenFor(employee)}`;
    await request(app).post('/me/clock/start').set('Authorization', auth);

    await triggerWorkClockEodAutoStop();

    const session = await request(app).get('/me/clock/session').set('Authorization', auth);
    expect(session.body.session.status).toBe('AWAITING_CONFIRM');
    expect(session.body.session.autoStopped).toBe(true);
  });

  it('blocks start when month is locked', async () => {
    const { employee } = await seedAssignedEmployee();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const [year, month] = today.split('-').map(Number);
    await prisma.monthLock.create({
      data: { year, month, lockedById: employee.id },
    });

    const response = await request(app)
      .post('/me/clock/start')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(response.status).toBe(409);
  });

  it('rejects unauthenticated clock calls with 401', async () => {
    const session = await request(app).get('/me/clock/session');
    expect(session.status).toBe(401);

    const start = await request(app).post('/me/clock/start');
    expect(start.status).toBe(401);
  });

  it('completes a stopped session so a new start is allowed', async () => {
    const { employee } = await seedAssignedEmployee();
    const auth = `Bearer ${tokenFor(employee)}`;

    await request(app).post('/me/clock/start').set('Authorization', auth);
    await request(app).post('/me/clock/stop').set('Authorization', auth);

    const complete = await request(app).post('/me/clock/complete').set('Authorization', auth);
    expect(complete.status).toBe(204);

    const cleared = await request(app).get('/me/clock/session').set('Authorization', auth);
    expect(cleared.body.session).toBeNull();

    const again = await request(app).post('/me/clock/start').set('Authorization', auth);
    expect(again.status).toBe(201);
  });

  it('allows start on a half-day absence', async () => {
    const { employee } = await seedAssignedEmployee();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    await createAbsence({
      userId: employee.id,
      startDate: new Date(`${today}T00:00:00.000Z`),
      endDate: new Date(`${today}T00:00:00.000Z`),
      halfDay: true,
    });

    const response = await request(app)
      .post('/me/clock/start')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(response.status).toBe(201);
  });
});
