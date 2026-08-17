import { Router } from 'express';
import { readRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { getHealth } from '../controllers/health.controller.js';

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Service readiness
 *     description: >
 *       Deliberately unauthenticated — a load balancer polling this
 *       shouldn't need credentials.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: The service and its database are reachable.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status]
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *       503:
 *         description: The database is unreachable.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, database, reason]
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 database:
 *                   type: string
 *                   example: abra_dev
 *                 reason:
 *                   type: string
 *                   example: unreachable
 */
healthRouter.get('/health', readRateLimit, getHealth);
