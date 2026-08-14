import { Router } from 'express';
import { postAdminUser } from '../controllers/adminUser.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { Role } from '../generated/prisma/enums.js';
import { createUserBodySchema } from '../types/adminUser.schema.js';

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
