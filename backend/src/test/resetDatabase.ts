import { prisma } from '../config/prisma.js';

const POSTGRES_DEADLOCK_DETECTED = '40P01';

/**
 * Truncates every application table (schema intact) so writes made by one
 * integration test are never visible to the next. Called from integration
 * tests' own `afterEach`, not wired in globally, so unit tests that never
 * touch the database don't pick up a DB dependency they don't need.
 *
 * Retries once on a Postgres deadlock: the fire-and-forget audit write in
 * rateLimit.middleware.ts (see openspec/changes/login-account-lockout) can
 * still be committing an INSERT into login_attempts from the just-finished
 * test when this TRUNCATE starts, and Postgres occasionally resolves that
 * lock conflict by picking one side as the deadlock victim. A short retry
 * is simpler and more honest than trying to await every fire-and-forget
 * write from test code.
 */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const names = tables.map((table) => `"${table.tablename}"`).join(', ');
  const truncate = () => prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);

  try {
    await truncate();
  } catch (error) {
    const isDeadlock =
      error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2010'
        ? String((error as { meta?: { code?: string } }).meta?.code) === POSTGRES_DEADLOCK_DETECTED
        : false;
    if (!isDeadlock) throw error;
    await truncate();
  }
}
