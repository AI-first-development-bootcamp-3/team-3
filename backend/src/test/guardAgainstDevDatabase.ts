import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

/**
 * The test suite truncates every table after each integration test — safe
 * against the test database, catastrophic against development data. Aborts
 * the run rather than risk that, comparing against `.env` directly (not
 * `process.env`) so it still catches the mistake even when something upstream
 * already forced DATABASE_URL to the test value.
 */
export function guardAgainstDevDatabase(testDatabaseUrl: string): void {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return;

  const devEnv = dotenv.parse(fs.readFileSync(envPath));
  const devDatabaseUrl = devEnv['DATABASE_URL'];

  if (devDatabaseUrl && devDatabaseUrl === testDatabaseUrl) {
    throw new Error(
      `Refusing to run tests: the test DATABASE_URL ("${testDatabaseUrl}") is identical to the ` +
        'development DATABASE_URL in .env. Tests truncate every table after each run — pointed at ' +
        'the dev database, this would destroy development data.',
    );
  }
}
