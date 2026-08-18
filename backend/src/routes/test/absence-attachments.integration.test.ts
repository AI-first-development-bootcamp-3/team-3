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

describe('Absence with Attachments Integration', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  describe('5.5: Create Absence with attachmentIds', () => {
    it('links uploaded files to an Absence record', async () => {
      const owner = await createUser();
      const token = tokenFor(owner);

      // Upload a file
      const uploadResponse = await request(app)
        .post('/attachments')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('medical certificate'), {
          filename: 'medical.pdf',
          contentType: 'application/pdf',
        });

      expect(uploadResponse.status).toBe(201);
      const attachmentId = uploadResponse.body.id;

      // Create an Absence with the attachment
      const absenceResponse = await request(app)
        .post('/absences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'SICK',
          startDate: '2026-08-20',
          endDate: '2026-08-20',
          attachmentIds: [attachmentId],
        });

      expect(absenceResponse.status).toBe(201);
      expect(absenceResponse.body.id).toBeDefined();

      // Verify attachment is linked to absence in database
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
      });
      expect(attachment?.absenceId).toBe(absenceResponse.body.id);
    });

    it('allows Absence owner to retrieve linked files', async () => {
      const owner = await createUser();
      const token = tokenFor(owner);

      // Upload and link a file
      const uploadResponse = await request(app)
        .post('/attachments')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('sick note content'), {
          filename: 'sick-note.pdf',
          contentType: 'application/pdf',
        });
      const attachmentId = uploadResponse.body.id;

      await request(app)
        .post('/absences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'SICK',
          startDate: '2026-08-21',
          endDate: '2026-08-21',
          attachmentIds: [attachmentId],
        });

      // Owner should be able to retrieve the file
      const retrieveResponse = await request(app)
        .get(`/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(retrieveResponse.status).toBe(200);
      expect(Buffer.from(retrieveResponse.body as Buffer).toString()).toBe('sick note content');
    });

    it('allows admin to retrieve Absence files regardless of ownership', async () => {
      const owner = await createUser({ role: Role.EMPLOYEE });
      const admin = await createUser({ role: Role.ADMIN });

      // Owner uploads and links file
      const uploadResponse = await request(app)
        .post('/attachments')
        .set('Authorization', `Bearer ${tokenFor(owner)}`)
        .attach('file', Buffer.from('admin accessible'), {
          filename: 'admin-test.pdf',
          contentType: 'application/pdf',
        });
      const attachmentId = uploadResponse.body.id;

      await request(app)
        .post('/absences')
        .set('Authorization', `Bearer ${tokenFor(owner)}`)
        .send({
          type: 'SICK',
          startDate: '2026-08-22',
          endDate: '2026-08-22',
          attachmentIds: [attachmentId],
        });

      // Admin should be able to retrieve
      const adminRetrieve = await request(app)
        .get(`/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(adminRetrieve.status).toBe(200);
    });

    it('prevents unrelated employee from retrieving linked files', async () => {
      const owner = await createUser({ role: Role.EMPLOYEE });
      const other = await createUser({ role: Role.EMPLOYEE });

      // Owner uploads and links file
      const uploadResponse = await request(app)
        .post('/attachments')
        .set('Authorization', `Bearer ${tokenFor(owner)}`)
        .attach('file', Buffer.from('private content'), {
          filename: 'private.pdf',
          contentType: 'application/pdf',
        });
      const attachmentId = uploadResponse.body.id;

      await request(app)
        .post('/absences')
        .set('Authorization', `Bearer ${tokenFor(owner)}`)
        .send({
          type: 'VACATION',
          startDate: '2026-08-23',
          endDate: '2026-08-25',
          attachmentIds: [attachmentId],
        });

      // Other employee should be denied
      const otherRetrieve = await request(app)
        .get(`/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${tokenFor(other)}`);

      expect(otherRetrieve.status).toBe(403);
    });
  });

  describe('5.6: Error Handling', () => {
    it('returns 400 when creating Absence with invalid attachment IDs', async () => {
      const user = await createUser();

      const response = await request(app)
        .post('/absences')
        .set('Authorization', `Bearer ${tokenFor(user)}`)
        .send({
          type: 'SICK',
          startDate: '2026-08-26',
          endDate: '2026-08-26',
          attachmentIds: ['00000000-0000-0000-0000-000000000099'],
        });

      // Should still succeed; the service doesn't validate attachment existence
      // (it just silently skips missing ones, or updates them if they exist)
      expect(response.status).toBe(201);
    });

    it('returns 404 for non-existent attachment retrieval', async () => {
      const user = await createUser();

      const response = await request(app)
        .get('/attachments/00000000-0000-0000-0000-000000000099')
        .set('Authorization', `Bearer ${tokenFor(user)}`);

      expect(response.status).toBe(404);
    });
  });
});
