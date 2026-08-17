import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { Role } from '../../generated/prisma/enums.js';
import { createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

function signToken(payload: object, options?: jwt.SignOptions): string {
  return jwt.sign(payload, env.JWT_SECRET, options);
}

describe('authenticate', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('allows a request with a valid, unexpired token and exposes the identity', async () => {
    const user = await createUser({ role: Role.EMPLOYEE });
    const token = signToken({ sub: user.id, role: Role.EMPLOYEE }, { expiresIn: '1h' });

    const response = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: expect.objectContaining({ sub: user.id, role: Role.EMPLOYEE }),
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

  it('rejects a valid token for a deactivated user with ACCOUNT_DEACTIVATED', async () => {
    const user = await createUser({ role: Role.EMPLOYEE, isActive: false });
    const token = signToken({ sub: user.id, role: Role.EMPLOYEE }, { expiresIn: '1h' });

    const response = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('rejects a valid token whose subject matches no stored user with UNAUTHORIZED', async () => {
    const token = signToken({ sub: crypto.randomUUID(), role: Role.EMPLOYEE }, { expiresIn: '1h' });

    const response = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('allows an unauthenticated request to a public route', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
  });

  // Every token signed via signToken()/tokenFor() above already carries a
  // plausible `iat` — jsonwebtoken stamps it automatically unless
  // `noTimestamp` is set — so those tests exercise the new `iat` contract
  // for free. The tests below drive the revocation gate itself (design.md
  // D7): rather than backdating a token's `iat` (which, combined with
  // `expiresIn`, would produce an already-expired token and trip
  // TOKEN_EXPIRED instead of SESSION_REVOKED), they move the user's
  // `sessionsValidFrom` boundary directly.
  it('rejects a token issued before the session-validity boundary with SESSION_REVOKED', async () => {
    const user = await createUser({ role: Role.EMPLOYEE });
    const token = signToken({ sub: user.id, role: Role.EMPLOYEE }, { expiresIn: '1h' });

    // Move the boundary to strictly after the token's `iat` second, without
    // touching the token itself.
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionsValidFrom: new Date(Date.now() + 2000) },
    });

    const response = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('SESSION_REVOKED');
  });

  it('allows a token issued after the session-validity boundary', async () => {
    const user = await createUser({ role: Role.EMPLOYEE });
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionsValidFrom: new Date(Date.now() - 5000) },
    });
    const token = signToken({ sub: user.id, role: Role.EMPLOYEE }, { expiresIn: '1h' });

    const response = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('rejects a token with no iat claim', async () => {
    const user = await createUser({ role: Role.EMPLOYEE });
    const token = signToken({ sub: user.id, role: Role.EMPLOYEE }, { noTimestamp: true, expiresIn: '1h' });

    const response = await request(app).get('/sample/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('leaves an earlier token working after authenticating again', async () => {
    const user = await createUser({ role: Role.EMPLOYEE });
    const earlierToken = signToken({ sub: user.id, role: Role.EMPLOYEE }, { expiresIn: '1h' });
    const laterToken = signToken({ sub: user.id, role: Role.EMPLOYEE }, { expiresIn: '1h' });

    // "Authenticating again" with a second token must not disturb the
    // first — logging in never moves sessionsValidFrom (design.md D6).
    const laterResponse = await request(app)
      .get('/sample/protected')
      .set('Authorization', `Bearer ${laterToken}`);
    expect(laterResponse.status).toBe(200);

    const earlierResponse = await request(app)
      .get('/sample/protected')
      .set('Authorization', `Bearer ${earlierToken}`);
    expect(earlierResponse.status).toBe(200);
  });
});

describe('requireRole', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('permits an administrator on the admin-only route', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const token = signToken({ sub: admin.id, role: Role.ADMIN }, { expiresIn: '1h' });

    const response = await request(app).get('/sample/admin-only').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('refuses an employee on the admin-only route with 403', async () => {
    const user = await createUser({ role: Role.EMPLOYEE });
    const token = signToken({ sub: user.id, role: Role.EMPLOYEE }, { expiresIn: '1h' });

    const response = await request(app).get('/sample/admin-only').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401, not 403, when the admin-only route is called with no token at all', async () => {
    const response = await request(app).get('/sample/admin-only');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it("takes the role from the stored account, ignoring a contradicting role in the request body", async () => {
    const user = await createUser({ role: Role.EMPLOYEE });
    const token = signToken({ sub: user.id, role: Role.EMPLOYEE }, { expiresIn: '1h' });

    const response = await request(app)
      .get('/sample/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(403);
  });

  it('refuses a demoted administrator on the admin-only route with the same still-valid token', async () => {
    const user = await createUser({ role: Role.ADMIN });
    const token = signToken({ sub: user.id, role: Role.ADMIN }, { expiresIn: '1h' });

    await prisma.user.update({ where: { id: user.id }, data: { role: Role.EMPLOYEE } });

    const response = await request(app).get('/sample/admin-only').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('permits a promoted user on the admin-only route with the same still-valid token', async () => {
    const user = await createUser({ role: Role.EMPLOYEE });
    const token = signToken({ sub: user.id, role: Role.EMPLOYEE }, { expiresIn: '1h' });

    await prisma.user.update({ where: { id: user.id }, data: { role: Role.ADMIN } });

    const response = await request(app).get('/sample/admin-only').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });
});
