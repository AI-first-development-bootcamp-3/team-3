import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { authGuardRateLimitStore } from '../../middleware/writeRateLimit.middleware.js';
import { Role } from '../../generated/prisma/enums.js';
import { createAbsence, createAttachment, createTimeReport, createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';
import { createAbsenceBodySchema } from '../../types/absence.schema.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('createAbsenceBodySchema', () => {
  it('defaults a missing endDate to startDate', () => {
    const parsed = createAbsenceBodySchema.parse({ type: 'VACATION', startDate: '2026-08-09' });
    expect(parsed.endDate).toBe('2026-08-09');
  });

  it('rejects an inverted range', () => {
    const result = createAbsenceBodySchema.safeParse({
      type: 'VACATION',
      startDate: '2026-08-13',
      endDate: '2026-08-09',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown type', () => {
    const result = createAbsenceBodySchema.safeParse({ type: 'HOLIDAY', startDate: '2026-08-09' });
    expect(result.success).toBe(false);
  });
});

describe('POST /absences', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('creates a single Sunday absence with one working day', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-09' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      userId: employee.id,
      type: 'VACATION',
      startDate: '2026-08-09',
      endDate: '2026-08-09',
      halfDay: false,
      workingDayCount: 1,
    });
    expect(await prisma.absence.count()).toBe(1);
  });

  it('counts Thursday through Sunday as two working days', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'SICK', startDate: '2026-08-13', endDate: '2026-08-16' });

    expect(response.status).toBe(201);
    expect(response.body.workingDayCount).toBe(2);
    expect(response.body.endDate).toBe('2026-08-16');
  });

  it('rejects a Friday-only range', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-14', endDate: '2026-08-14' });

    expect(response.status).toBe(400);
    expect(await prisma.absence.count()).toBe(0);
  });

  it('rejects an absence in a locked month with 409', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    await prisma.monthLock.create({ data: { year: 2026, month: 8, lockedById: employee.id } });

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-09' });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe('החודש נעול — לא ניתן לדווח');
    expect(await prisma.absence.count()).toBe(0);
  });

  it('rejects overlap with an existing absence', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-09T00:00:00.000Z'),
      endDate: new Date('2026-08-11T00:00:00.000Z'),
    });

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-10', endDate: '2026-08-12' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: '2026-08-10', message: 'OVERLAPPING_ABSENCE' })]),
    );
    expect(await prisma.absence.count()).toBe(1);
  });

  it('rejects a date that already has reported work hours', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    await createTimeReport({ userId: employee.id, date: new Date('2026-08-10T00:00:00.000Z') });

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'OTHER', startDate: '2026-08-10' });

    expect(response.status).toBe(409);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: '2026-08-10', message: 'WORK_HOURS_CONFLICT' })]),
    );
    expect(await prisma.absence.count()).toBe(0);
  });

  it('rejects an unauthenticated caller', async () => {
    const response = await request(app).post('/absences').send({ type: 'VACATION', startDate: '2026-08-09' });

    expect(response.status).toBe(401);
    expect(await prisma.absence.count()).toBe(0);
  });
});

describe('GET /absences', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('lists absences that overlap the requested month', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-17T00:00:00.000Z'),
      endDate: new Date('2026-08-19T00:00:00.000Z'),
    });

    const response = await request(app)
      .get('/absences')
      .query({ month: 8, year: 2026 })
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(200);
    expect(response.body.absences).toHaveLength(1);
    expect(response.body.absences[0]).toMatchObject({
      userId: employee.id,
      startDate: '2026-08-17',
      endDate: '2026-08-19',
    });
  });

  it('rejects an unauthenticated caller', async () => {
    const response = await request(app).get('/absences').query({ month: 8, year: 2026 });

    expect(response.status).toBe(401);
  });
});

describe('PATCH /absences/:id', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('updates the dates and recomputes workingDayCount', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const absence = await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-09T00:00:00.000Z'),
      endDate: new Date('2026-08-09T00:00:00.000Z'),
    });

    const response = await request(app)
      .patch(`/absences/${absence.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'SICK', startDate: '2026-08-13', endDate: '2026-08-16' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: absence.id,
      type: 'SICK',
      startDate: '2026-08-13',
      endDate: '2026-08-16',
      workingDayCount: 2,
    });
  });

  it('does not conflict with its own prior dates', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const absence = await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-09T00:00:00.000Z'),
      endDate: new Date('2026-08-11T00:00:00.000Z'),
    });

    const response = await request(app)
      .patch(`/absences/${absence.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-10', endDate: '2026-08-12' });

    expect(response.status).toBe(200);
  });

  it('still conflicts with a different absence', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const absence = await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-09T00:00:00.000Z'),
      endDate: new Date('2026-08-09T00:00:00.000Z'),
    });
    await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-13T00:00:00.000Z'),
      endDate: new Date('2026-08-13T00:00:00.000Z'),
    });

    const response = await request(app)
      .patch(`/absences/${absence.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-13' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('rejects an inverted range', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const absence = await createAbsence({ userId: employee.id });

    const response = await request(app)
      .patch(`/absences/${absence.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-13', endDate: '2026-08-09' });

    expect(response.status).toBe(400);
  });

  it("refuses another user's absence", async () => {
    const owner = await createUser({ role: Role.EMPLOYEE });
    const other = await createUser({ role: Role.EMPLOYEE });
    const absence = await createAbsence({ userId: owner.id });

    const response = await request(app)
      .patch(`/absences/${absence.id}`)
      .set('Authorization', `Bearer ${tokenFor(other)}`)
      .send({ type: 'VACATION', startDate: '2026-08-16' });

    expect(response.status).toBe(403);
  });

  it('returns 404 for an unknown or already cancelled id', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const cancelled = await createAbsence({ userId: employee.id, isActive: false });

    const missing = await request(app)
      .patch(`/absences/${randomUUID()}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-16' });
    const inactive = await request(app)
      .patch(`/absences/${cancelled.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-16' });

    expect(missing.status).toBe(404);
    expect(inactive.status).toBe(404);
  });

  it('reconciles attachments to the submitted set', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const absence = await createAbsence({ userId: employee.id });
    const kept = await createAttachment({ uploaderId: employee.id, absenceId: absence.id });
    const dropped = await createAttachment({ uploaderId: employee.id, absenceId: absence.id });
    const added = await createAttachment({ uploaderId: employee.id });

    const response = await request(app)
      .patch(`/absences/${absence.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-16', attachmentIds: [kept.id, added.id] });

    expect(response.status).toBe(200);
    expect(response.body.attachments.map((a: { id: string }) => a.id).sort()).toEqual(
      [kept.id, added.id].sort(),
    );
    expect((await prisma.attachment.findUniqueOrThrow({ where: { id: dropped.id } })).absenceId).toBeNull();
    expect((await prisma.attachment.findUniqueOrThrow({ where: { id: added.id } })).absenceId).toBe(absence.id);
  });

  it('rejects an unauthenticated caller', async () => {
    const absence = await createAbsence();

    const response = await request(app).patch(`/absences/${absence.id}`).send({ type: 'VACATION', startDate: '2026-08-16' });

    expect(response.status).toBe(401);
  });
});

describe('DELETE /absences/:id', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('soft-deletes the caller\'s absence', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const absence = await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-24T00:00:00.000Z'),
      endDate: new Date('2026-08-26T00:00:00.000Z'),
    });

    const response = await request(app)
      .delete(`/absences/${absence.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(204);
    expect(await prisma.absence.count({ where: { id: absence.id } })).toBe(0);
    const stored = await prisma.absence.findFirst({
      where: { id: absence.id, isActive: undefined },
    });
    expect(stored?.isActive).toBe(false);
  });

  it('rejects deleting an absence in a locked month with 409', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const absence = await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-24T00:00:00.000Z'),
      endDate: new Date('2026-08-26T00:00:00.000Z'),
    });
    await prisma.monthLock.create({ data: { year: 2026, month: 8, lockedById: employee.id } });

    const response = await request(app)
      .delete(`/absences/${absence.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(409);
    expect(await prisma.absence.count({ where: { id: absence.id } })).toBe(1);
  });

  it('refuses another user\'s absence', async () => {
    const owner = await createUser({ role: Role.EMPLOYEE });
    const other = await createUser({ role: Role.EMPLOYEE });
    const absence = await createAbsence({ userId: owner.id });

    const response = await request(app)
      .delete(`/absences/${absence.id}`)
      .set('Authorization', `Bearer ${tokenFor(other)}`);

    expect(response.status).toBe(403);
    expect(await prisma.absence.count({ where: { id: absence.id } })).toBe(1);
  });

  it('returns 404 for an unknown or already cancelled id', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const cancelled = await createAbsence({ userId: employee.id, isActive: false });

    const missing = await request(app)
      .delete(`/absences/${randomUUID()}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    const inactive = await request(app)
      .delete(`/absences/${cancelled.id}`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(missing.status).toBe(404);
    expect(inactive.status).toBe(404);
  });

  it('rejects an unauthenticated caller', async () => {
    const response = await request(app).delete(`/absences/${randomUUID()}`);

    expect(response.status).toBe(401);
  });
});

describe('absence authentication guard', () => {
  const MAX = env.RATE_LIMIT_AUTH_GUARD_MAX_REQUESTS;

  beforeEach(async () => {
    await authGuardRateLimitStore.resetAll();
  });

  afterEach(async () => {
    await authGuardRateLimitStore.resetAll();
    await resetDatabase();
  });

  it('answers 429 once an address exhausts the quota without ever authenticating', async () => {
    // No token on any of these: the guard sits ahead of `authenticate`, so a
    // caller that never authenticates still spends quota - which is the whole
    // point of having it there. Issued in batches to keep the number of
    // concurrent sockets bounded.
    for (let sent = 0; sent < MAX; sent += 60) {
      const batch = Math.min(60, MAX - sent);
      await Promise.all(
        Array.from({ length: batch }, () => request(app).post('/absences').send({}).expect(401)),
      );
    }

    const throttled = await request(app).post('/absences').send({});

    expect(throttled.status).toBe(429);
    expect(Number(throttled.headers['retry-after'])).toBeGreaterThan(0);
    expect(throttled.body).toEqual({
      error: { code: 'TOO_MANY_REQUESTS', message: expect.any(String) },
    });
  }, 30000);
});
