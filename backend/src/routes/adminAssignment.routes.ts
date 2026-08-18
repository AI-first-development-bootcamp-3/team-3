import { Router } from 'express';
import { deleteAdminAssignment, getAdminAssignments, postAdminAssignments } from '../controllers/adminAssignment.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { readRateLimit, writeRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { Role } from '../generated/prisma/enums.js';
import { createAssignmentsBodySchema, deleteAssignmentQuerySchema } from '../types/adminAssignment.schema.js';

export const adminAssignmentRouter = Router();

/**
 * @openapi
 * /admin/assignments:
 *   get:
 *     summary: List open tasks with assigned workers (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: One row per OPEN task under an active client and project.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *   post:
 *     summary: Assign one or more users to an open task (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId, userIds]
 *             properties:
 *               taskId: { type: string, format: uuid }
 *               userIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: The task row after assignment.
 *       400:
 *         description: Malformed body or unknown/inactive users.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *       404:
 *         description: Task not found or not OPEN.
 *   delete:
 *     summary: Remove one user from a task (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: taskId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Assignment removed.
 *       400:
 *         description: Malformed query.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *       404:
 *         description: Assignment not found.
 */
adminAssignmentRouter.get(
  '/admin/assignments',
  readRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  getAdminAssignments,
);

adminAssignmentRouter.post(
  '/admin/assignments',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ body: createAssignmentsBodySchema }),
  postAdminAssignments,
);

adminAssignmentRouter.delete(
  '/admin/assignments',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ query: deleteAssignmentQuerySchema }),
  deleteAdminAssignment,
);
