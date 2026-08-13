import type { RequestHandler } from 'express';

/**
 * Readiness signal for container orchestration and deployment platforms.
 * Deliberately unauthenticated — a load balancer polling this shouldn't
 * need credentials. Gains a database connectivity check in the data-layer
 * feature, once there is a database to check.
 */
export const getHealth: RequestHandler = (_req, res) => {
  res.status(200).json({ status: 'ok' });
};
