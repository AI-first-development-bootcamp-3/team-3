import { Router } from 'express';
import {
  getMyReportingOptions,
  getMyTimeReports,
  postTimeReport,
  postTimeReportBatch,
  deleteMyTimeReportsForDate,
} from '../controllers/timeReport.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { readRateLimit, writeRateLimit } from '../middleware/writeRateLimit.middleware.js';
import {
  createTimeReportBatchBodySchema,
  createTimeReportBodySchema,
  deleteTimeReportsQuerySchema,
  listTimeReportsQuerySchema,
} from '../types/timeReport.schema.js';

export const timeReportRouter = Router();

/**
 * @openapi
 * /reports:
 *   post:
 *     summary: Create a daily time report for the authenticated caller
 *     description: >
 *       The fields the report must carry follow the project's stored
 *       `reportFormat`, never a body field: a `SUM_HOURS` project takes `hours`
 *       and no row times, a `CLOCK_IN_OUT` project takes `rowStartTime` +
 *       `rowEndTime` and no `hours`. Carrying the other format's fields is a
 *       `400`.
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
 *               startTime: { type: string, example: '09:00', description: 'Day attendance window start (HH:mm). End earlier than or equal to start means the next calendar day (equal = 24h).' }
 *               endTime: { type: string, example: '18:00', description: 'Day attendance window end (HH:mm)' }
 *               hours: { type: number, example: 9, description: 'Required for a SUM_HOURS project, forbidden for a CLOCK_IN_OUT one: allocation from 0.5 to 24 with at most one decimal place; must not exceed the window' }
 *               rowStartTime: { type: string, example: '09:00', description: 'Required for a CLOCK_IN_OUT project, forbidden for a SUM_HOURS one: this row own clock-in (HH:mm), inside the day window on the same overnight-aware axis' }
 *               rowEndTime: { type: string, example: '13:00', description: 'Required for a CLOCK_IN_OUT project, forbidden for a SUM_HOURS one: this row own clock-out (HH:mm), strictly later than `rowStartTime` on the day axis and inside the window' }
 *               clientId: { type: string, format: uuid }
 *               projectId: { type: string, format: uuid }
 *               taskId: { type: string, format: uuid }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: >
 *           The persisted time report. `startTime`/`endTime` are the day window;
 *           `rowStartTime`/`rowEndTime` carry the row clock pair on a
 *           `CLOCK_IN_OUT` row and are `null` otherwise; `hours` is the value
 *           submitted (`SUM_HOURS`) or derived from the row interval, rounded to
 *           one decimal (`CLOCK_IN_OUT`).
 *       400:
 *         description: >
 *           Malformed body, fields that contradict the project's `reportFormat`,
 *           row times outside the day window or of zero length, hours overflow
 *           (`HOURS_EXCEED_WINDOW`), hierarchy mismatch, or a task the caller is
 *           not assigned to (both reported on `taskId`).
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
 *         description: Every saved row in the month, plus whether that month is locked.
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
  // Ahead of `authenticate` on purpose, so the token verify and user-row read
  // that middleware performs sit behind the limiter rather than in front of it.
  // Address-keyed as a consequence — see the middleware's own comment.
  readRateLimit,
  authenticate,
  validate({ query: listTimeReportsQuerySchema }),
  getMyTimeReports,
);

/**
 * @openapi
 * /reports:
 *   delete:
 *     summary: Delete every time-report row the caller saved on one calendar date
 *     tags: [Time reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date, example: '2026-08-16' }
 *     responses:
 *       204:
 *         description: The caller's rows for that date were deleted.
 *       400:
 *         description: Missing or malformed date.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: The caller has no rows on that date.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Too many report writes from this caller.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
timeReportRouter.delete(
  '/reports',
  authenticate,
  writeRateLimit,
  validate({ query: deleteTimeReportsQuerySchema }),
  deleteMyTimeReportsForDate,
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
 *     summary: Replace every project row of one day in a single transaction
 *     description: >
 *       All rows persist or none do. Row-level problems are reported as
 *       `rows.<index>.<field>` so the client can mark the failing card. Each row
 *       is validated against the stored `reportFormat` of the project it names,
 *       so a `SUM_HOURS` row carries `hours` and a `CLOCK_IN_OUT` row carries
 *       `rowStartTime` + `rowEndTime`; both kinds may share one day. No two
 *       `CLOCK_IN_OUT` rows of a day may share a minute — an overlap is a `400`
 *       naming every clashing row (intervals that merely touch are fine).
 *     tags: [Time reports]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, startTime, endTime, rows]
 *             properties:
 *               date: { type: string, format: date, example: '2026-08-16' }
 *               startTime: { type: string, example: '09:00', description: 'Shared day window start (HH:mm). Overnight when end ≤ start.' }
 *               endTime: { type: string, example: '18:00', description: 'Shared day window end (HH:mm)' }
 *               rows:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   required: [workLocation, clientId, projectId, taskId]
 *                   properties:
 *                     workLocation: { type: string, enum: [OFFICE, CLIENT, HOME] }
 *                     hours: { type: number, example: 4, description: 'Required for a SUM_HOURS row, forbidden for a CLOCK_IN_OUT one: allocation from 0.5 to 24 with at most one decimal place' }
 *                     rowStartTime: { type: string, example: '09:00', description: 'Required for a CLOCK_IN_OUT row, forbidden for a SUM_HOURS one: this row own clock-in (HH:mm), inside the day window' }
 *                     rowEndTime: { type: string, example: '13:00', description: 'Required for a CLOCK_IN_OUT row, forbidden for a SUM_HOURS one: this row own clock-out (HH:mm), strictly later than `rowStartTime` on the day axis and inside the window' }
 *                     clientId: { type: string, format: uuid }
 *                     projectId: { type: string, format: uuid }
 *                     taskId: { type: string, format: uuid }
 *                     description: { type: string, description: 'Optional' }
 *     responses:
 *       201:
 *         description: >
 *           The persisted rows, in submitted order, each copying the request
 *           window onto `startTime`/`endTime`, keeping its own
 *           `rowStartTime`/`rowEndTime` when its project is `CLOCK_IN_OUT`
 *           (`null` otherwise), and carrying `hours` submitted or derived.
 *       400:
 *         description: >
 *           Malformed body, a row whose fields contradict its project's
 *           `reportFormat`, row times outside the day window or of zero length,
 *           two clock-in/out rows that overlap, hours overflow
 *           (`HOURS_EXCEED_WINDOW`, derived hours counted in), hierarchy
 *           mismatch on any row, or a row naming a task the caller is not
 *           assigned to — except a row already stored for that caller and date,
 *           which stays saveable after its assignment is withdrawn.
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
 *     summary: Assigned client → project → task tree for the report form
 *     description: >
 *       Only the active tasks the caller is assigned to, with projects and
 *       clients left empty by that filtering pruned away. The same scoping
 *       applies to every role, admins included. Every project carries its
 *       `reportFormat`, so the form renders the right inputs before the user
 *       types anything.
 *     tags: [Time reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Nested clients with projects and tasks, sorted by name.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       projects:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string, format: uuid }
 *                             name: { type: string }
 *                             reportFormat: { type: string, enum: [SUM_HOURS, CLOCK_IN_OUT], description: 'Decides whether a row on this project collects `hours` or a `rowStartTime`/`rowEndTime` pair' }
 *                             tasks:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id: { type: string, format: uuid }
 *                                   name: { type: string }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
timeReportRouter.get('/me/reporting-options', authenticate, getMyReportingOptions);
