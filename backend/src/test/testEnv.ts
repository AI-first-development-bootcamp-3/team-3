/**
 * The environment every test process runs with. Single source of truth for
 * vitest.config.ts (`test.env`, which is what test files see) and
 * globalSetup.ts (whose child process is not guaranteed to inherit it).
 */
export const testEnv = {
  NODE_ENV: 'test',
  PORT: '4000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/abra_test',
  CORS_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'test-only-secret-at-least-32-characters-long',
  LOG_LEVEL: 'silent',
} as const;
