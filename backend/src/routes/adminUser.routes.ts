import { Router } from 'express';
import { patchAdminUserResetPassword, patchAdminUserRole, postAdminUser } from '../controllers/adminUser.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { Role } from '../generated/prisma/enums.js';
import { changeRoleBodySchema, createUserBodySchema, userIdParamSchema } from '../types/adminUser.schema.js';

export const adminUserRouter = Router();

/**
 * @openapi
 * /admin/users:
 *   post:
 *     summary: Create a user account (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, displayName, role]
 *             properties:
 *               email: { type: string, format: email }
 *               displayName: { type: string }
 *               role: { type: string, enum: [ADMIN, EMPLOYEE] }
 *               temporaryPassword: { type: string, minLength: 8, description: 'Optional - generated when omitted' }
 *     responses:
 *       201:
 *         description: The created user and their temporary password (shown once).
 *       400:
 *         description: Malformed request body.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: A user with this email already exists.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
adminUserRouter.post(
  '/admin/users',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ body: createUserBodySchema }),
  postAdminUser,
);

/**
 * @openapi
 * /admin/users/{id}/reset-password:
 *   patch:
 *     summary: Reset a user's password to a newly generated temporary password (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The user and their new temporary password (shown once).
 *       400:
 *         description: Malformed id.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No user with that id.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
adminUserRouter.patch(
  '/admin/users/:id/reset-password',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: userIdParamSchema }),
  patchAdminUserResetPassword,
);

/**
 * @openapi
 * /admin/users/{id}/role:
 *   patch:
 *     summary: Change a user's role (admin only)
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
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [ADMIN, EMPLOYEE] }
 *     responses:
 *       200:
 *         description: The updated user.
 *       400:
 *         description: Malformed id or role.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Caller is authenticated but not an administrator.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No user with that id.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
adminUserRouter.patch(
  '/admin/users/:id/role',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: userIdParamSchema, body: changeRoleBodySchema }),
  patchAdminUserRole,
);
