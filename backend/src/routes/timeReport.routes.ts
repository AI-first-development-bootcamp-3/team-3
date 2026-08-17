import { Router } from 'express';
import {
  getMyReportingOptions,
  getMyTimeReports,
  postTimeReport,
  postTimeReportBatch,
} from '../controllers/timeReport.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { readRateLimit, writeRateLimit } from '../middleware/writeRateLimit.middleware.js';
import {
  createTimeReportBatchBodySchema,
  createTimeReportBodySchema,
  listTimeReportsQuerySchema,
} from '../types/timeReport.schema.js';

export const timeReportRouter = Router();

/**
 * @openapi
 * /reports:
 *   post:
 *     summary: Create a daily time report for the authenticated caller
 *     tags: [Time reports]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, workLocation, startTime, endTime, clientId, projectId, taskId, description]
 *             properties:
 *               date: { type: string, format: date, example: '2026-08-16' }
 *               workLocation: { type: string, enum: [OFFICE, CLIENT, HOME] }
 *               startTime: { type: string, example: '09:00', description: 'HH:mm' }
 *               endTime: { type: string, example: '18:00', description: 'HH:mm' }
 *               clientId: { type: string, format: uuid }
 *               projectId: { type: string, format: uuid }
 *               taskId: { type: string, format: uuid }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: The persisted time report.
 *       400:
 *         description: Malformed body, invalid interval, or hierarchy mismatch.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Too many report writes from this caller. Retry after the duration given in the `Retry-After` header.
 *         headers:
 *           Retry-After:
 *             schema: { type: integer }
 *             description: Seconds to wait before retrying.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
/**
 * @openapi
 * /reports:
 *   get:
 *     summary: List the authenticated caller's time reports for one calendar month
 *     tags: [Time reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer, minimum: 2000, maximum: 2100 }
 *     responses:
 *       200:
 *         description: Every saved row in the month, with hierarchy names and duration.
 *       400:
 *         description: Invalid month or year.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Too many read requests from this caller. Retry after the duration given in the `Retry-After` header.
 *         headers:
 *           Retry-After:
 *             schema: { type: integer }
 *             description: Seconds to wait before retrying.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
timeReportRouter.get(
  '/reports',
  authenticate,
  readRateLimit,
  validate({ query: listTimeReportsQuerySchema }),
  getMyTimeReports,
);

timeReportRouter.post(
  '/reports',
  authenticate,
  writeRateLimit,
  validate({ body: createTimeReportBodySchema }),
  postTimeReport,
);

/**
 * @openapi
 * /reports/batch:
 *   post:
 *     summary: Create every project row of one day in a single transaction
 *     description: >
 *       All rows persist or none do. Row-level problems are reported as
 *       `rows.<index>.<field>` so the client can mark the failing card.
 *     tags: [Time reports]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, rows]
 *             properties:
 *               date: { type: string, format: date, example: '2026-08-16' }
 *               rows:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   required: [workLocation, startTime, endTime, clientId, projectId, taskId]
 *                   properties:
 *                     workLocation: { type: string, enum: [OFFICE, CLIENT, HOME] }
 *                     startTime: { type: string, example: '09:00', description: 'HH:mm' }
 *                     endTime: { type: string, example: '13:00', description: 'HH:mm' }
 *                     clientId: { type: string, format: uuid }
 *                     projectId: { type: string, format: uuid }
 *                     taskId: { type: string, format: uuid }
 *                     description: { type: string, description: 'Optional' }
 *     responses:
 *       201:
 *         description: The persisted rows, in submitted order.
 *       400:
 *         description: Malformed body, invalid interval, or hierarchy mismatch on any row.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Too many report writes from this caller. Retry after the duration given in the `Retry-After` header.
 *         headers:
 *           Retry-After:
 *             schema: { type: integer }
 *             description: Seconds to wait before retrying.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
timeReportRouter.post(
  '/reports/batch',
  authenticate,
  writeRateLimit,
  validate({ body: createTimeReportBatchBodySchema }),
  postTimeReportBatch,
);

/**
 * @openapi
 * /me/reporting-options:
 *   get:
 *     summary: Active client → project → task tree for the report form
 *     description: Not assignment-filtered yet (SCRUM-71). Returns all active entities with at least one task.
 *     tags: [Time reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Nested clients with projects and tasks, sorted by name.
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
timeReportRouter.get('/me/reporting-options', authenticate, getMyReportingOptions);
