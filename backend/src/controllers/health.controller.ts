import type { RequestHandler } from 'express';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

/**
 * Extracts just the database name from a Postgres connection string, so an
 * unreachable-database response names what's unreachable without leaking
 * the full connection string (host, credentials) to callers.
 */
function databaseName(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).pathname.replace(/^\//, '') || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Readiness signal for container orchestration and deployment platforms.
 * Deliberately unauthenticated — a load balancer polling this shouldn't
 * need credentials.
 */
export const getHealth: RequestHandler = async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok' });
  } catch {
    res
      .status(503)
      .json({ status: 'error', database: databaseName(env.DATABASE_URL), reason: 'unreachable' });
  }
};
