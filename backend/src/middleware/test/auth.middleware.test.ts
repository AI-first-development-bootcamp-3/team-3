import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { Role } from '../../generated/prisma/enums.js';

function signToken(payload: object, options?: jwt.SignOptions): string {
  return jwt.sign(payload, env.JWT_SECRET, options);
}

describe('authenticate', () => {
  it('allows a request with a valid, unexpired token and exposes the identity', async () => {
    const token = signToken({ sub: 'user-1', role: Role.EMPLOYEE }, { expiresIn: '1h' });

    const response = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: expect.objectContaining({ sub: 'user-1', role: Role.EMPLOYEE }),
    });
  });

  it('rejects a request with no token', async () => {
    const response = await request(app).get('/sample/protected');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed token', async () => {
    const response = await request(app).get('/sample/protected').set('Authorization', 'Bearer not-a-jwt');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a token signed with the wrong key', async () => {
    const token = jwt.sign({ sub: 'user-1', role: Role.EMPLOYEE }, 'a-completely-different-secret-value');

    const response = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an expired token with a distinct code', async () => {
    const token = signToken({ sub: 'user-1', role: Role.EMPLOYEE }, { expiresIn: -1 });

    const response = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('requireRole', () => {
  it('permits an administrator on the admin-only route', async () => {
    const token = signToken({ sub: 'admin-1', role: Role.ADMIN }, { expiresIn: '1h' });

    const response = await request(app).get('/sample/admin-only').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('refuses an employee on the admin-only route with 403', async () => {
    const token = signToken({ sub: 'user-1', role: Role.EMPLOYEE }, { expiresIn: '1h' });

    const response = await request(app).get('/sample/admin-only').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401, not 403, when the admin-only route is called with no token at all', async () => {
    const response = await request(app).get('/sample/admin-only');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it("takes the role from the verified token, ignoring a contradicting role in the request body", async () => {
    const token = signToken({ sub: 'user-1', role: Role.EMPLOYEE }, { expiresIn: '1h' });

    const response = await request(app)
      .get('/sample/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(403);
  });
});
