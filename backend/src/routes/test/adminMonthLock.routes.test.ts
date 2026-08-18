import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { Role } from '../../generated/prisma/enums.js';
import { createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /admin/month-locks', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('lists locked months for the requested year', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    await request(app)
      .post('/admin/month-locks')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ year: 2026, month: 7 });

    const response = await request(app)
      .get('/admin/month-locks?year=2026')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.locks).toEqual([
      expect.objectContaining({ year: 2026, month: 7, lockedById: admin.id }),
    ]);
  });

  it('rejects a non-admin caller with 403', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const response = await request(app)
      .get('/admin/month-locks?year=2026')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(response.status).toBe(403);
  });
});

describe('POST /admin/month-locks', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('locks a month and then refuses a second lock', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const created = await request(app)
      .post('/admin/month-locks')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ year: 2026, month: 8 });

    expect(created.status).toBe(201);
    expect(created.body.lock).toMatchObject({ year: 2026, month: 8, lockedById: admin.id });

    const again = await request(app)
      .post('/admin/month-locks')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ year: 2026, month: 8 });
    expect(again.status).toBe(409);
  });
});

describe('DELETE /admin/month-locks/:year/:month', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('unlocks a locked month', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    await request(app)
      .post('/admin/month-locks')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ year: 2026, month: 8 });

    const unlocked = await request(app)
      .delete('/admin/month-locks/2026/8')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(unlocked.status).toBe(204);

    const listed = await request(app)
      .get('/admin/month-locks?year=2026')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(listed.body.locks).toEqual([]);
  });

  it('returns 404 when the month was not locked', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const response = await request(app)
      .delete('/admin/month-locks/2026/1')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(response.status).toBe(404);
  });
});
