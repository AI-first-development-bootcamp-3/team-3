import { prisma } from '../config/prisma.js';

/**
 * Truncates every application table (schema intact) so writes made by one
 * integration test are never visible to the next. Called from integration
 * tests' own `afterEach`, not wired in globally, so unit tests that never
 * touch the database don't pick up a DB dependency they don't need.
 */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const names = tables.map((table) => `"${table.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}
