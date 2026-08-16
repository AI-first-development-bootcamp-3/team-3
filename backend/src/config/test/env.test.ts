import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseEnv, parseTrustProxy } from '../env.js';

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
      JWT_EXPIRES_IN_SECONDS: 28800,
      JWT_REMEMBER_ME_EXPIRES_IN_SECONDS: 2592000,
      LOG_LEVEL: 'debug',
      STORAGE_DIR: './storage/uploads',
      RATE_LIMIT_EMAIL_MAX_ATTEMPTS: 5,
      RATE_LIMIT_IP_MAX_ATTEMPTS: 50,
      RATE_LIMIT_WINDOW_SECONDS: 900,
      TRUST_PROXY: 'false',
    });
  });

  it('applies defaults for NODE_ENV, PORT, LOG_LEVEL, and STORAGE_DIR when omitted', () => {
    const env = parseEnv(minimalRequired);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.STORAGE_DIR).toBe('./storage/uploads');
  });

  it('applies defaults for the rate-limit and trust-proxy settings when omitted', () => {
    const env = parseEnv(minimalRequired);

    expect(env.RATE_LIMIT_EMAIL_MAX_ATTEMPTS).toBe(5);
    expect(env.RATE_LIMIT_IP_MAX_ATTEMPTS).toBe(50);
    expect(env.RATE_LIMIT_WINDOW_SECONDS).toBe(900);
    expect(env.TRUST_PROXY).toBe('false');
  });

  it('accepts explicit rate-limit values', () => {
    const env = parseEnv({
      ...minimalRequired,
      RATE_LIMIT_EMAIL_MAX_ATTEMPTS: '3',
      RATE_LIMIT_IP_MAX_ATTEMPTS: '30',
      RATE_LIMIT_WINDOW_SECONDS: '60',
    });

    expect(env.RATE_LIMIT_EMAIL_MAX_ATTEMPTS).toBe(3);
    expect(env.RATE_LIMIT_IP_MAX_ATTEMPTS).toBe(30);
    expect(env.RATE_LIMIT_WINDOW_SECONDS).toBe(60);
  });

  it('rejects an IP rate-limit threshold lower than the email threshold', () => {
    expect(() =>
      parseEnv({
        ...minimalRequired,
        RATE_LIMIT_EMAIL_MAX_ATTEMPTS: '10',
        RATE_LIMIT_IP_MAX_ATTEMPTS: '5',
      }),
    ).toThrow(EnvValidationError);
  });

  it('accepts an IP threshold equal to the email threshold', () => {
    const env = parseEnv({
      ...minimalRequired,
      RATE_LIMIT_EMAIL_MAX_ATTEMPTS: '5',
      RATE_LIMIT_IP_MAX_ATTEMPTS: '5',
    });

    expect(env.RATE_LIMIT_IP_MAX_ATTEMPTS).toBe(5);
  });

  it('applies defaults for JWT_EXPIRES_IN_SECONDS and JWT_REMEMBER_ME_EXPIRES_IN_SECONDS when omitted', () => {
    const env = parseEnv(minimalRequired);

    expect(env.JWT_EXPIRES_IN_SECONDS).toBe(28800);
    expect(env.JWT_REMEMBER_ME_EXPIRES_IN_SECONDS).toBe(2592000);
  });

  it('accepts explicit JWT lifetime values', () => {
    const env = parseEnv({
      ...minimalRequired,
      JWT_EXPIRES_IN_SECONDS: '3600',
      JWT_REMEMBER_ME_EXPIRES_IN_SECONDS: '604800',
    });

    expect(env.JWT_EXPIRES_IN_SECONDS).toBe(3600);
    expect(env.JWT_REMEMBER_ME_EXPIRES_IN_SECONDS).toBe(604800);
  });

  it('rejects a remember-me lifetime shorter than the default lifetime', () => {
    expect(() =>
      parseEnv({
        ...minimalRequired,
        JWT_EXPIRES_IN_SECONDS: '28800',
        JWT_REMEMBER_ME_EXPIRES_IN_SECONDS: '3600',
      }),
    ).toThrow(EnvValidationError);
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

describe('parseTrustProxy', () => {
  it('parses "false" and an empty string as disabled', () => {
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('')).toBe(false);
  });

  it('parses "true" as trusting the first hop', () => {
    expect(parseTrustProxy('true')).toBe(true);
  });

  it('is case-insensitive for true/false', () => {
    expect(parseTrustProxy('TRUE')).toBe(true);
    expect(parseTrustProxy('False')).toBe(false);
  });

  it('parses a bare integer as a hop count', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('2')).toBe(2);
  });

  it('parses a single address as a one-element list', () => {
    expect(parseTrustProxy('10.0.0.1')).toEqual(['10.0.0.1']);
  });

  it('parses a comma-separated list of addresses, trimming whitespace', () => {
    expect(parseTrustProxy('10.0.0.1, 10.0.0.2 ,loopback')).toEqual([
      '10.0.0.1',
      '10.0.0.2',
      'loopback',
    ]);
  });
});
