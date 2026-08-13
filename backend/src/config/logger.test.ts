import { describe, expect, it } from 'vitest';
import { logger } from './logger.js';

describe('logger', () => {
  it('is configured with the log level from the environment', () => {
    expect(logger.level).toBe(process.env.LOG_LEVEL ?? 'info');
  });

  it('exposes the standard pino logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});
