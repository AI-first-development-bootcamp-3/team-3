import { Router } from 'express';
import { patchMyPassword, postLogin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { changePasswordBodySchema, loginBodySchema } from '../types/auth.schema.js';

export const authRouter = Router();

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Authenticate with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: A JWT and the caller's profile, including whether they must change their password before doing anything else.
 *       400:
 *         description: Malformed request body.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Wrong email/password, or the account is inactive.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
authRouter.post('/login', validate({ body: loginBodySchema }), postLogin);

/**
 * @openapi
 * /me/password:
 *   patch:
 *     summary: Set a new password for the authenticated caller
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password updated; mustChangePassword is now false.
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
 */
authRouter.patch('/me/password', authenticate, validate({ body: changePasswordBodySchema }), patchMyPassword);
