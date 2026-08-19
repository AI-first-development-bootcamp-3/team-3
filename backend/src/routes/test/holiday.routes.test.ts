import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { Role } from '../../generated/prisma/enums.js';
import { createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /holidays', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('returns 401 without a token', async () => {
    const response = await request(app).get('/holidays?year=2026');
    expect(response.status).toBe(401);
  });

  it('returns 400 when year is missing', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const response = await request(app).get('/holidays').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(response.status).toBe(400);
  });

  it('lists 2026 holidays with Hebrew names and civil dates', async () => {
    const employee = await createUser({ role: Role.EMPLOYEE });
    const response = await request(app)
      .get('/holidays?year=2026')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(response.status).toBe(200);
    const pesach = response.body.holidays.find((row: { code: string }) => row.code === 'pesach');
    expect(pesach).toEqual({ code: 'pesach', nameHe: 'פסח', date: '2026-04-01' });
    expect(await prisma.israeliHoliday.count({ where: { year: 2026 } })).toBeGreaterThan(0);
  });
});
