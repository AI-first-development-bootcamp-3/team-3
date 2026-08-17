import { Router } from 'express';
import { getAdminClients, patchAdminClient, postAdminClient } from '../controllers/adminClient.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { readRateLimit, writeRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { Role } from '../generated/prisma/enums.js';
import { clientIdParamSchema, createClientBodySchema, updateClientBodySchema } from '../types/adminClient.schema.js';

export const adminClientRouter = Router();

/**
 * @openapi
 * /admin/clients:
 *   get:
 *     summary: List all clients (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All clients.
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
 *   post:
 *     summary: Create a client (admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               contactDetails: { type: string }
 *     responses:
 *       201:
 *         description: The created client, active by default.
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
 */
// readRateLimit/writeRateLimit run *ahead* of authenticate on purpose - see
// their doc comments in writeRateLimit.middleware.ts. A limiter placed after
// authenticate leaves that token-verify/user-row-read work itself
// unprotected, both to CodeQL's js/missing-rate-limiting and in fact.
adminClientRouter.get('/admin/clients', readRateLimit, authenticate, requireRole(Role.ADMIN), getAdminClients);

adminClientRouter.post(
  '/admin/clients',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ body: createClientBodySchema }),
  postAdminClient,
);

/**
 * @openapi
 * /admin/clients/{id}:
 *   patch:
 *     summary: Update a client's name, contact details, or active status (admin only)
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
 *               contactDetails: { type: string }
 *               isActive: { type: boolean, description: 'false deactivates (soft-deletes) the client' }
 *     responses:
 *       200:
 *         description: The updated client.
 *       400:
 *         description: Malformed id or body.
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
 *         description: No client with that id.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
adminClientRouter.patch(
  '/admin/clients/:id',
  writeRateLimit,
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: clientIdParamSchema, body: updateClientBodySchema }),
  patchAdminClient,
);
