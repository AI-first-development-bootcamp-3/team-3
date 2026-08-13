import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseEnv } from './env.js';

const minimalRequired = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  CORS_ORIGIN: 'http://localhost:5173,http://localhost:3000',
  JWT_SECRET: 'a'.repeat(32),
};

describe('parseEnv', () => {
  it('parses a fully valid environment', () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      PORT: '4000',
      ...minimalRequired,
      LOG_LEVEL: 'debug',
    });

    expect(env).toEqual({
      NODE_ENV: 'test',
      PORT: 4000,
      DATABASE_URL: minimalRequired.DATABASE_URL,
      CORS_ORIGIN: ['http://localhost:5173', 'http://localhost:3000'],
      JWT_SECRET: minimalRequired.JWT_SECRET,
      LOG_LEVEL: 'debug',
    });
  });

  it('applies defaults for NODE_ENV, PORT, and LOG_LEVEL when omitted', () => {
    const env = parseEnv(minimalRequired);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('coerces PORT from a string to a number', () => {
    const env = parseEnv({ ...minimalRequired, PORT: '8080' });

    expect(env.PORT).toBe(8080);
  });

  it('splits CORS_ORIGIN on commas and trims whitespace', () => {
    const env = parseEnv({ ...minimalRequired, CORS_ORIGIN: ' http://a.com , http://b.com ' });

    expect(env.CORS_ORIGIN).toEqual(['http://a.com', 'http://b.com']);
  });

  it('throws EnvValidationError when DATABASE_URL is missing', () => {
    expect(() =>
      parseEnv({
        CORS_ORIGIN: minimalRequired.CORS_ORIGIN,
        JWT_SECRET: minimalRequired.JWT_SECRET,
      }),
    ).toThrow(EnvValidationError);
  });

  it('reports every missing or invalid field in a single error', () => {
    expect.assertions(5);

    try {
      parseEnv({ PORT: 'not-a-number' });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validationError = error as EnvValidationError;
      expect(validationError.issues.some((issue) => issue.startsWith('DATABASE_URL'))).toBe(true);
      expect(validationError.issues.some((issue) => issue.startsWith('CORS_ORIGIN'))).toBe(true);
      expect(validationError.issues.some((issue) => issue.startsWith('JWT_SECRET'))).toBe(true);
      expect(validationError.issues.some((issue) => issue.startsWith('PORT'))).toBe(true);
    }
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() => parseEnv({ ...minimalRequired, JWT_SECRET: 'too-short' })).toThrow(
      EnvValidationError,
    );
  });

  it('rejects an invalid NODE_ENV value', () => {
    expect(() => parseEnv({ ...minimalRequired, NODE_ENV: 'staging' })).toThrow(EnvValidationError);
  });
});
