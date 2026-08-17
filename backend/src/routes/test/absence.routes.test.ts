import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { createAbsence, createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('POST /absences', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it.each(['VACATION', 'SICK', 'RESERVE_DUTY', 'OTHER'])('creates a %s absence for the authenticated employee', async (type) => {
    const employee = await createUser();

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type, startDate: '2026-08-18' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      userId: employee.id,
      type,
      startDate: '2026-08-18',
      endDate: '2026-08-18',
      halfDay: false,
    });
    expect(await prisma.absence.count({ where: { userId: employee.id, type } })).toBe(1);
  });

  it('a single date, with endDate omitted, is stored with startDate === endDate', async () => {
    const employee = await createUser();

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-18' });

    expect(response.status).toBe(201);
    expect(response.body.startDate).toBe(response.body.endDate);
  });

  it('a date range is persisted as a single record covering the whole range', async () => {
    const employee = await createUser();

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'SICK', startDate: '2026-08-18', endDate: '2026-08-20' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ startDate: '2026-08-18', endDate: '2026-08-20' });
    expect(await prisma.absence.count({ where: { userId: employee.id } })).toBe(1);
  });

  it('a range spanning a weekend excludes Friday and Saturday from workingDaysCount', async () => {
    const employee = await createUser();

    // 2026-08-16 (Sun) .. 2026-08-22 (Sat): a full week, 5 working days.
    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-16', endDate: '2026-08-22' });

    expect(response.status).toBe(201);
    expect(response.body.workingDaysCount).toBe(5);
  });

  it('rejects an inverted range (endDate before startDate) with 400 and creates no row', async () => {
    const employee = await createUser();

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-20', endDate: '2026-08-18' });

    expect(response.status).toBe(400);
    expect(await prisma.absence.count()).toBe(0);
  });

  it('rejects an overlapping absence with 409 naming every clashing date, and creates no row', async () => {
    const employee = await createUser();
    await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-18T00:00:00.000Z'),
      endDate: new Date('2026-08-19T00:00:00.000Z'),
    });

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'OTHER', startDate: '2026-08-19', endDate: '2026-08-20' });

    expect(response.status).toBe(409);
    const details = response.body.error.details as { field: string; message: string }[];
    expect(details.map((detail) => detail.field)).toEqual(['2026-08-19']);
    expect(details[0]?.message).toEqual(expect.any(String));
    expect(await prisma.absence.count({ where: { userId: employee.id } })).toBe(1);
  });

  it('a request with no conflict succeeds even when the caller has other, non-overlapping absences', async () => {
    const employee = await createUser();
    await createAbsence({
      userId: employee.id,
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      endDate: new Date('2026-08-01T00:00:00.000Z'),
    });

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-18' });

    expect(response.status).toBe(201);
  });

  it('rejects an unauthenticated caller with 401 and creates no row', async () => {
    const response = await request(app).post('/absences').send({ type: 'VACATION', startDate: '2026-08-18' });

    expect(response.status).toBe(401);
    expect(await prisma.absence.count()).toBe(0);
  });

  it('rejects a type outside the fixed list with 400 and creates no row', async () => {
    const employee = await createUser();

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'PARENTAL_LEAVE', startDate: '2026-08-18' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.some((detail: { field: string }) => detail.field === 'type')).toBe(true);
    expect(await prisma.absence.count()).toBe(0);
  });

  it('rejects a missing startDate with 400 and creates no row', async () => {
    const employee = await createUser();

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION' });

    expect(response.status).toBe(400);
    expect(await prisma.absence.count()).toBe(0);
  });

  it('ignores a userId in the body and always stores the caller as owner', async () => {
    const employee = await createUser();
    const someoneElse = await createUser();

    const response = await request(app)
      .post('/absences')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ type: 'VACATION', startDate: '2026-08-18', userId: someoneElse.id });

    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(employee.id);
  });
});