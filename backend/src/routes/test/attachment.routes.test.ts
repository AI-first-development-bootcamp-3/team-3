import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { Role } from '../../generated/prisma/enums.js';
import { createUser } from '../../test/factories.js';
import { resetDatabase } from '../../test/resetDatabase.js';

const isUsingMockCredentials = env.SUPABASE_URL?.includes('test.supabase.co');

function tokenFor(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe.skipIf(isUsingMockCredentials)('POST /attachments', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('stores a permitted file and returns its metadata', async () => {
    const user = await createUser();
    const content = Buffer.from('%PDF-1.4 fake pdf');

    const response = await request(app)
      .post('/attachments')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .attach('file', content, { filename: 'note.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      filename: 'note.pdf',
      mimeType: 'application/pdf',
      sizeBytes: content.byteLength,
    });
  });

  it('rejects an unauthenticated upload', async () => {
    const response = await request(app)
      .post('/attachments')
      .attach('file', Buffer.from('data'), { filename: 'note.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(401);
  });

  it('rejects a disallowed content type', async () => {
    const user = await createUser();

    const response = await request(app)
      .post('/attachments')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .attach('file', Buffer.from('data'), { filename: 'note.exe', contentType: 'application/x-msdownload' });

    expect(response.status).toBe(400);
  });

  it('rejects a file exceeding the size limit', async () => {
    const user = await createUser();
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);

    const response = await request(app)
      .post('/attachments')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .attach('file', oversized, { filename: 'big.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(413);
  }, 15000);
});

describe.skipIf(isUsingMockCredentials)('GET /attachments/:id', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  async function uploadAs(user: { id: string; role: string }): Promise<string> {
    const response = await request(app)
      .post('/attachments')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .attach('file', Buffer.from('owner-only content'), { filename: 'note.pdf', contentType: 'application/pdf' });
    return response.body.id as string;
  }

  it('lets the owner retrieve their own attachment', async () => {
    const owner = await createUser();
    const id = await uploadAs(owner);

    const response = await request(app).get(`/attachments/${id}`).set('Authorization', `Bearer ${tokenFor(owner)}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(Buffer.from(response.body as Buffer).toString()).toBe('owner-only content');
  });

  it('lets an administrator retrieve any attachment', async () => {
    const owner = await createUser({ role: Role.EMPLOYEE });
    const admin = await createUser({ role: Role.ADMIN });
    const id = await uploadAs(owner);

    const response = await request(app).get(`/attachments/${id}`).set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
  });

  it('refuses an unrelated employee with 403', async () => {
    const owner = await createUser({ role: Role.EMPLOYEE });
    const otherEmployee = await createUser({ role: Role.EMPLOYEE });
    const id = await uploadAs(owner);

    const response = await request(app)
      .get(`/attachments/${id}`)
      .set('Authorization', `Bearer ${tokenFor(otherEmployee)}`);

    expect(response.status).toBe(403);
  });

  it('returns 404 for an unknown id', async () => {
    const user = await createUser();

    const response = await request(app)
      .get('/attachments/00000000-0000-0000-0000-000000000099')
      .set('Authorization', `Bearer ${tokenFor(user)}`);

    expect(response.status).toBe(404);
  });

  it('rejects an unauthenticated retrieval', async () => {
    const owner = await createUser();
    const id = await uploadAs(owner);

    const response = await request(app).get(`/attachments/${id}`);

    expect(response.status).toBe(401);
  });
});
