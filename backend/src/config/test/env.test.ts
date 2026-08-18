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
      JWT_REMEMBER_ME_EXPIRES_IN_SECONDS: 604800,
      LOG_LEVEL: 'debug',
      STORAGE_DIR: './storage/uploads',
      SMTP_PORT: 587,
      EMAIL_FROM: 'no-reply@abra-timesheet.test',
      RATE_LIMIT_EMAIL_MAX_ATTEMPTS: 5,
      RATE_LIMIT_IP_MAX_ATTEMPTS: 50,
      RATE_LIMIT_WINDOW_SECONDS: 900,
      RATE_LIMIT_WRITE_MAX_REQUESTS: 60,
      RATE_LIMIT_READ_MAX_REQUESTS: 600,
      RATE_LIMIT_AUTH_GUARD_MAX_REQUESTS: 1200,
      RATE_LIMIT_LOGOUT_MAX_REQUESTS: 60,
      LOCKOUT_MAX_ATTEMPTS: 10,
      LOCKOUT_WINDOW_HOURS: 24,
      LOCKOUT_DURATION_MINUTES: 30,
      TRUST_PROXY: 'false',
    });
  });

  it('applies defaults for NODE_ENV, PORT, LOG_LEVEL, STORAGE_DIR, SMTP_PORT, EMAIL_FROM, rate-limit, lockout, and trust-proxy settings when omitted', () => {
    const env = parseEnv(minimalRequired);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.STORAGE_DIR).toBe('./storage/uploads');
    expect(env.SMTP_HOST).toBeUndefined();
    expect(env.SMTP_PORT).toBe(587);
    expect(env.EMAIL_FROM).toBe('no-reply@abra-timesheet.test');
    expect(env.RATE_LIMIT_EMAIL_MAX_ATTEMPTS).toBe(5);
    expect(env.RATE_LIMIT_IP_MAX_ATTEMPTS).toBe(50);
    expect(env.RATE_LIMIT_WINDOW_SECONDS).toBe(900);
    expect(env.RATE_LIMIT_WRITE_MAX_REQUESTS).toBe(60);
    expect(env.RATE_LIMIT_READ_MAX_REQUESTS).toBe(600)
    expect(env.RATE_LIMIT_AUTH_GUARD_MAX_REQUESTS).toBe(1200);
    expect(env.RATE_LIMIT_LOGOUT_MAX_REQUESTS).toBe(60);
    expect(env.LOCKOUT_MAX_ATTEMPTS).toBe(10);
    expect(env.LOCKOUT_WINDOW_HOURS).toBe(24);
    expect(env.LOCKOUT_DURATION_MINUTES).toBe(30);
    expect(env.TRUST_PROXY).toBe('false');
  });

  it('accepts SMTP configuration when provided', () => {
    const env = parseEnv({
      ...minimalRequired,
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '2525',
      SMTP_USER: 'user',
      SMTP_PASSWORD: 'pass',
      EMAIL_FROM: 'admin@example.test',
    });

    expect(env.SMTP_HOST).toBe('smtp.example.test');
    expect(env.SMTP_PORT).toBe(2525);
    expect(env.SMTP_USER).toBe('user');
    expect(env.SMTP_PASSWORD).toBe('pass');
    expect(env.EMAIL_FROM).toBe('admin@example.test');
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

  it('accepts explicit lockout values above the rate-limit values', () => {
    const env = parseEnv({
      ...minimalRequired,
      RATE_LIMIT_EMAIL_MAX_ATTEMPTS: '5',
      RATE_LIMIT_WINDOW_SECONDS: '900',
      LOCKOUT_MAX_ATTEMPTS: '20',
      LOCKOUT_WINDOW_HOURS: '48',
      LOCKOUT_DURATION_MINUTES: '60',
    });

    expect(env.LOCKOUT_MAX_ATTEMPTS).toBe(20);
    expect(env.LOCKOUT_WINDOW_HOURS).toBe(48);
    expect(env.LOCKOUT_DURATION_MINUTES).toBe(60);
  });

  it('rejects a lockout threshold not greater than the email rate-limit threshold', () => {
    expect(() =>
      parseEnv({
        ...minimalRequired,
        RATE_LIMIT_EMAIL_MAX_ATTEMPTS: '10',
        LOCKOUT_MAX_ATTEMPTS: '10',
      }),
    ).toThrow(EnvValidationError);
  });

  it('rejects a lockout window not longer than the rate-limit window', () => {
    expect(() =>
      parseEnv({
        ...minimalRequired,
        RATE_LIMIT_WINDOW_SECONDS: '86400',
        LOCKOUT_WINDOW_HOURS: '24',
      }),
    ).toThrow(EnvValidationError);
  });

  it('applies defaults for JWT_EXPIRES_IN_SECONDS and JWT_REMEMBER_ME_EXPIRES_IN_SECONDS when omitted', () => {
    const env = parseEnv(minimalRequired);

    expect(env.JWT_EXPIRES_IN_SECONDS).toBe(28800);
    expect(env.JWT_REMEMBER_ME_EXPIRES_IN_SECONDS).toBe(604800);
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
