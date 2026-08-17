import { prisma } from '../config/prisma.js';

const POSTGRES_DEADLOCK_DETECTED = '40P01';
const MAX_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [20, 50, 100];

function isDeadlock(error: unknown): boolean {
  if (!(error instanceof Error) || !('code' in error)) return false;
  if ((error as { code?: string }).code !== 'P2010') return false;
  return String((error as { meta?: { code?: string } }).meta?.code) === POSTGRES_DEADLOCK_DETECTED;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncates every application table (schema intact) so writes made by one
 * integration test are never visible to the next. Called from integration
 * tests' own `afterEach`, not wired in globally, so unit tests that never
 * touch the database don't pick up a DB dependency they don't need.
 *
 * Retries with backoff on a Postgres deadlock: the fire-and-forget audit
 * write in rateLimit.middleware.ts (see
 * openspec/changes/login-account-lockout) can still be committing an
 * INSERT into login_attempts from the just-finished test when this
 * TRUNCATE starts, and Postgres occasionally resolves that lock conflict
 * by picking one side as the deadlock victim - sometimes more than once in
 * a row, since the very next attempt's own writes can still be landing
 * too. A short bounded retry is simpler and more honest than trying to
 * await every fire-and-forget write from test code; any error that is not
 * this specific, known, transient conflict still fails immediately.
 */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const names = tables.map((table) => `"${table.tablename}"`).join(', ');
  const truncate = () => prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await truncate();
      return;
    } catch (error) {
      if (!isDeadlock(error) || attempt === MAX_ATTEMPTS - 1) throw error;
      await sleep(RETRY_DELAYS_MS[attempt] ?? 100);
    }
  }
}
