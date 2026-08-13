import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('GET /health', () => {
  it('returns 200 with service status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('requires no authentication', async () => {
    const response = await request(app).get('/health');

    expect(response.status).not.toBe(401);
  });
});
