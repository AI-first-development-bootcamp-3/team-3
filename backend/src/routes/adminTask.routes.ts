import { Router } from 'express';
import { getAdminTasks, patchAdminTask, postAdminTask } from '../controllers/adminTask.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { readRateLimit, writeRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { Role } from '../generated/prisma/enums.js';
import { createTaskBodySchema, taskIdParamSchema, updateTaskBodySchema } from '../types/adminTask.schema.js';

export const adminTaskRouter = Router();

/**
 * @openapi
 * /admin/tasks:
 *   get:
 *     summary: List all tasks (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All tasks including closed and inactive.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *   post:
 *     summary: Create a task under an active project (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, projectId]
 *             properties:
 *               name: { type: string }
 *               projectId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: The created task, OPEN by default.
 *       400:
 *         description: Malformed body or inactive/unknown project.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 */
adminTaskRouter.get('/admin/tasks', readRateLimit, authenticate, requireRole(Role.ADMIN), getAdminTasks);

adminTaskRouter.post(
  '/admin/tasks',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ body: createTaskBodySchema }),
  postAdminTask,
);

/**
 * @openapi
 * /admin/tasks/{id}:
 *   patch:
 *     summary: Update a task's name, status, or active flag (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               status: { type: string, enum: [OPEN, CLOSED], description: 'CLOSED is the admin "delete task" action' }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: The updated task.
 *       400:
 *         description: Malformed id or body.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *       404:
 *         description: No task with that id.
 */
adminTaskRouter.patch(
  '/admin/tasks/:id',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: taskIdParamSchema, body: updateTaskBodySchema }),
  patchAdminTask,
);
