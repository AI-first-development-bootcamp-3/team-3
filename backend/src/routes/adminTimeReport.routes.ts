import { Router } from 'express';
import {
  deleteAdminEmployeeReportsForDate,
  getAdminEmployeeReportAudits,
  getAdminEmployeeReports,
  getAdminReportingOptions,
  postAdminEmployeeReportsBatch,
} from '../controllers/adminTimeReport.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { readRateLimit, writeRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { Role } from '../generated/prisma/enums.js';
import {
  adminDeleteEmployeeReportsQuerySchema,
  adminEmployeeReportsQuerySchema,
  adminReportingOptionsQuerySchema,
  adminReplaceEmployeeReportsBodySchema,
} from '../types/adminTimeReport.schema.js';

export const adminTimeReportRouter = Router();

/**
 * @openapi
 * /admin/reports:
 *   get:
 *     summary: List one employee's time reports for a calendar month (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: The employee's rows in that month.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *       404:
 *         description: That user does not exist.
 *   delete:
 *     summary: Delete every time-report row of one employee on one date (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: reason
 *         required: false
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: The employee's rows for that date were deleted and audited.
 *       404:
 *         description: User or day not found.
 */
adminTimeReportRouter.get(
  '/admin/reports',
  readRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ query: adminEmployeeReportsQuerySchema }),
  getAdminEmployeeReports,
);

adminTimeReportRouter.delete(
  '/admin/reports',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ query: adminDeleteEmployeeReportsQuerySchema }),
  deleteAdminEmployeeReportsForDate,
);

/**
 * @openapi
 * /admin/reports/options:
 *   get:
 *     summary: Assigned reporting tree for a chosen employee (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The employee's client → project → task tree.
 */
adminTimeReportRouter.get(
  '/admin/reports/options',
  readRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ query: adminReportingOptionsQuerySchema }),
  getAdminReportingOptions,
);

/**
 * @openapi
 * /admin/reports/audit:
 *   get:
 *     summary: Admin edits of one employee's reports in a calendar month
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Append-only audit rows, newest first.
 */
adminTimeReportRouter.get(
  '/admin/reports/audit',
  readRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ query: adminEmployeeReportsQuerySchema }),
  getAdminEmployeeReportAudits,
);

/**
 * @openapi
 * /admin/reports/batch:
 *   post:
 *     summary: Replace one employee's day of time reports (admin only)
 *     description: >
 *       Same validation as `POST /reports/batch`, scoped to the named employee
 *       (assignments, formats, windows). Writes an audit row in the same
 *       transaction. Employee self-saves never hit this trail.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, date, startTime, endTime, rows]
 *             properties:
 *               userId: { type: string, format: uuid }
 *               date: { type: string, format: date }
 *               startTime: { type: string }
 *               endTime: { type: string }
 *               reason: { type: string }
 *               rows: { type: array }
 *     responses:
 *       201:
 *         description: The persisted rows for that employee.
 */
adminTimeReportRouter.post(
  '/admin/reports/batch',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ body: adminReplaceEmployeeReportsBodySchema }),
  postAdminEmployeeReportsBatch,
);
