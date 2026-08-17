import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { env } from '../config/env.js';
import { rateLimitStore } from '../middleware/rateLimit.middleware.js';

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

describe('rate-limit address resolution', () => {
  it('ignores a client-supplied X-Forwarded-For when TRUST_PROXY is disabled, so spoofing it cannot pick a fresh bucket', async () => {
    rateLimitStore.reset();
    const IP_MAX = env.RATE_LIMIT_IP_MAX_ATTEMPTS;

    // Every request claims a different forwarded address. If the app trusted
    // it, each would land in its own untouched bucket and never trip the
    // threshold. It should not trust it - TRUST_PROXY defaults to disabled.
    for (let i = 0; i < IP_MAX; i++) {
      const response = await request(app)
        .post('/login')
        .set('X-Forwarded-For', `10.0.0.${i}`)
        .send({ email: `spoof-${i}@example.test`, password: 'wrong' });
      expect(response.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/login')
      .set('X-Forwarded-For', '10.0.0.250')
      .send({ email: 'spoof-final@example.test', password: 'wrong' });

    expect(blocked.status).toBe(429);
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
