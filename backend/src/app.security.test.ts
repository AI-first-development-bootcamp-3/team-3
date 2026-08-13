import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('CORS', () => {
  it('permits a configured origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not grant access to an unconfigured origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://evil.example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('supports credentialed requests from an allowed origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});

describe('security headers', () => {
  it('prevents MIME-type sniffing and clickjacking', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeTruthy();
  });

  it('does not disclose the underlying server framework', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
