import { execFileSync } from 'node:child_process';
import { guardAgainstDevDatabase } from './guardAgainstDevDatabase.js';
import { testEnv } from './testEnv.js';

/**
 * Runs once before the whole suite starts, in a process that isn't
 * guaranteed to inherit vitest.config.ts's `test.env` — so it sets
 * DATABASE_URL explicitly from the same shared `testEnv` rather than relying
 * on inheritance. Applies the same migrations used by every other
 * environment to the test database, so tests exercise the real schema
 * rather than a mock.
 */
export default function setup(): void {
  guardAgainstDevDatabase(testEnv.DATABASE_URL);

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, ...testEnv },
  });
}
