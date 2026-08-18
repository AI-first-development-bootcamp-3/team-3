import { Router } from 'express';
import { getAdminProjects, patchAdminProject, postAdminProject } from '../controllers/adminProject.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { readRateLimit, writeRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { Role } from '../generated/prisma/enums.js';
import { createProjectBodySchema, projectIdParamSchema, updateProjectBodySchema } from '../types/adminProject.schema.js';

export const adminProjectRouter = Router();

/**
 * @openapi
 * /admin/projects:
 *   get:
 *     summary: List all projects (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All projects including inactive.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *   post:
 *     summary: Create a project under an active client (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, clientId]
 *             properties:
 *               name: { type: string }
 *               clientId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: The created project, CLOCK_IN_OUT and active by default.
 *       400:
 *         description: Malformed body or inactive/unknown client.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 */
adminProjectRouter.get('/admin/projects', readRateLimit, authenticate, requireRole(Role.ADMIN), getAdminProjects);

adminProjectRouter.post(
  '/admin/projects',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ body: createProjectBodySchema }),
  postAdminProject,
);

/**
 * @openapi
 * /admin/projects/{id}:
 *   patch:
 *     summary: Update a project's name, active status, or report format (admin only)
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
 *               isActive: { type: boolean, description: 'false deactivates (soft-deletes) the project' }
 *               reportFormat: { type: string, enum: [CLOCK_IN_OUT, SUM_HOURS] }
 *     responses:
 *       200:
 *         description: The updated project.
 *       400:
 *         description: Malformed id or body.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *       404:
 *         description: No project with that id.
 */
adminProjectRouter.patch(
  '/admin/projects/:id',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: projectIdParamSchema, body: updateProjectBodySchema }),
  patchAdminProject,
);
