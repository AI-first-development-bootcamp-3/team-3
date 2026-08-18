import { Router } from 'express';
import {
  deleteAdminMonthLock,
  getAdminMonthLocks,
  postAdminMonthLock,
} from '../controllers/adminMonthLock.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { readRateLimit, writeRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { Role } from '../generated/prisma/enums.js';
import {
  listMonthLocksQuerySchema,
  lockMonthBodySchema,
  monthLockParamSchema,
} from '../types/adminMonthLock.schema.js';

export const adminMonthLockRouter = Router();

/**
 * @openapi
 * /admin/month-locks:
 *   get:
 *     summary: List locked months for a calendar year (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Locked months in that year.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *   post:
 *     summary: Lock a calendar month so employees cannot report into it (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [year, month]
 *             properties:
 *               year: { type: integer }
 *               month: { type: integer, minimum: 1, maximum: 12 }
 *     responses:
 *       201:
 *         description: The created lock.
 *       409:
 *         description: That month is already locked.
 */
adminMonthLockRouter.get(
  '/admin/month-locks',
  readRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ query: listMonthLocksQuerySchema }),
  getAdminMonthLocks,
);

adminMonthLockRouter.post(
  '/admin/month-locks',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ body: lockMonthBodySchema }),
  postAdminMonthLock,
);

/**
 * @openapi
 * /admin/month-locks/{year}/{month}:
 *   delete:
 *     summary: Unlock a calendar month (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: month
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: The month is unlocked.
 *       404:
 *         description: That month was not locked.
 */
adminMonthLockRouter.delete(
  '/admin/month-locks/:year/:month',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: monthLockParamSchema }),
  deleteAdminMonthLock,
);
