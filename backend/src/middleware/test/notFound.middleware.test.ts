import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';

describe('404 handler', () => {
  it('returns the standard error shape for an unmatched route', async () => {
    const response = await request(app).get('/this-route-does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'No route matches GET /this-route-does-not-exist',
      },
    });
  });
});
