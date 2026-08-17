import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { env } from '../config/env.js';
import { Role } from '../generated/prisma/enums.js';
import { createUser } from './factories.js';
import { resetDatabase } from './resetDatabase.js';

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * End-to-end coverage for SCRUM-218: deactivating a user must revoke access
 * mid-session, not only at the next login. Exercises login, the admin status
 * endpoint, and the auth middleware together rather than any one in isolation.
 */
describe('deactivation revokes an existing session', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('an employee token stops working the moment an admin deactivates the account', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const employee = await createUser({ email: 'revoke-employee@example.test', role: Role.EMPLOYEE });
    const employeeToken = tokenFor(employee);

    const before = await request(app).get('/sample/protected').set('Authorization', `Bearer ${employeeToken}`);
    expect(before.status).toBe(200);

    const deactivate = await request(app)
      .patch(`/admin/users/${employee.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.user.isActive).toBe(false);

    const after = await request(app).get('/sample/protected').set('Authorization', `Bearer ${employeeToken}`);
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('a deactivated administrator can no longer create a user with their still-valid token', async () => {
    const admin1 = await createUser({ role: Role.ADMIN });
    const admin2 = await createUser({ email: 'revoke-admin2@example.test', role: Role.ADMIN });
    const admin2Token = tokenFor(admin2);

    const createBefore = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${admin2Token}`)
      .send({ email: 'created-before-revoke@example.test', displayName: 'Before Revoke', role: 'EMPLOYEE' });
    expect(createBefore.status).toBe(201);

    const deactivate = await request(app)
      .patch(`/admin/users/${admin2.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin1)}`)
      .send({ isActive: false });
    expect(deactivate.status).toBe(200);

    const createAfter = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${admin2Token}`)
      .send({ email: 'created-after-revoke@example.test', displayName: 'After Revoke', role: 'EMPLOYEE' });
    expect(createAfter.status).toBe(401);
    expect(createAfter.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('reactivating restores access to a token issued before the deactivation', async () => {
    const admin = await createUser({ role: Role.ADMIN });
    const employee = await createUser({ email: 'revoke-reactivate@example.test', role: Role.EMPLOYEE });
    const employeeToken = tokenFor(employee);

    await request(app)
      .patch(`/admin/users/${employee.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: false });

    const whileDeactivated = await request(app)
      .get('/sample/protected')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(whileDeactivated.status).toBe(401);

    const reactivate = await request(app)
      .patch(`/admin/users/${employee.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ isActive: true });
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.user.isActive).toBe(true);

    const afterReactivation = await request(app)
      .get('/sample/protected')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(afterReactivation.status).toBe(200);
  });
});

// A deactivated user's login is already refused with a 401 identical to wrong
// credentials — see 'rejects an inactive account even with the correct
// password' in routes/test/auth.routes.test.ts.
