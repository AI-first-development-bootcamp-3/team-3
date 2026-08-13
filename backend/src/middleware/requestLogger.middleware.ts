import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pinoHttp } from 'pino-http';
import { logger } from '../config/logger.js';

export const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  'req.body.jwt',
  'res.headers["set-cookie"]',
];

export function genReqId(req: IncomingMessage, res: ServerResponse): string {
  const existing = req.headers['x-request-id'];
  const id = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

/**
 * One structured log record per request: method, path, status, duration, and
 * a correlation id shared by every record that request produces. Sensitive
 * headers and fields are redacted so secrets never reach the logs.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId,
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err: Error | undefined) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
});
