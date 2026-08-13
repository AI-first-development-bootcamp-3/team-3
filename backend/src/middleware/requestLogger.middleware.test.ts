import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { redactPaths } from './requestLogger.middleware.js';

describe('request logging', () => {
  it('attaches a correlation id header to the response', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('reuses an inbound correlation id instead of minting a new one', async () => {
    const response = await request(app).get('/health').set('x-request-id', 'fixed-correlation-id');

    expect(response.headers['x-request-id']).toBe('fixed-correlation-id');
  });

  it('redacts authorization headers and password fields from emitted logs', () => {
    const lines: string[] = [];
    const destination = { write: (line: string) => lines.push(line) };
    const testLogger = pino({ redact: { paths: redactPaths, censor: '[REDACTED]' } }, destination);

    testLogger.info({
      req: { headers: { authorization: 'Bearer secret-token', cookie: 'session=abc' } },
      res: { headers: { 'set-cookie': 'session=abc' } },
      body: undefined,
    });

    const logged = lines.join('\n');
    expect(logged).not.toContain('secret-token');
    expect(logged).not.toContain('session=abc');
    expect(logged).toContain('[REDACTED]');
  });
});
