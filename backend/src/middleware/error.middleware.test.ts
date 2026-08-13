import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../config/logger.js';
import { AppError } from '../types/errors.js';
import { errorHandler } from './error.middleware.js';

/**
 * A small, isolated app rather than the real one — this test needs routes
 * that deliberately throw, which have no business existing in app.ts.
 */
function buildTestApp() {
  const testApp = express();

  testApp.get('/known-error', () => {
    throw AppError.badRequest('Missing field', [{ field: 'email', message: 'Required' }]);
  });

  testApp.get('/unexpected-error', () => {
    throw new Error('connection failed: postgres://user:hunter2@db-host:5432/prod');
  });

  testApp.use(errorHandler);

  return testApp;
}

describe('errorHandler', () => {
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('returns an AppError as-is, in the standard shape', async () => {
    const response = await request(buildTestApp()).get('/known-error');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'Missing field',
        details: [{ field: 'email', message: 'Required' }],
      },
    });
  });

  it('sanitises an unexpected error into a generic 500', async () => {
    const response = await request(buildTestApp()).get('/unexpected-error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain('postgres://');
    expect(serialised).not.toContain('hunter2');
  });

  it('logs the full unexpected error server-side for diagnosis', async () => {
    await request(buildTestApp()).get('/unexpected-error');

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.objectContaining({ message: expect.stringContaining('postgres://user:hunter2') }),
      }),
      'Unhandled error',
    );
  });
});
