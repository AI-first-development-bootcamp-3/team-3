import { Router } from 'express';
import { patchMyPassword, postLogin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { changePasswordBodySchema, loginBodySchema, type LoginBody } from '../types/auth.schema.js';

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
 *               rememberMe: { type: boolean, default: false, description: "Extends the issued token's lifetime from the default (hours) to the remember-me duration (days)." }
 *     responses:
 *       200:
 *         description: A JWT, its expiry, and the caller's profile, including whether they must change their password before doing anything else.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 expiresAt: { type: string, format: date-time }
 *                 user: { type: object }
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
 *       429:
 *         description: Too many failed attempts for this email or client address. Retry after the duration given in the `Retry-After` header.
 *         headers:
 *           Retry-After:
 *             schema: { type: integer }
 *             description: Seconds to wait before retrying.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
authRouter.post(
  '/login',
  validate({ body: loginBodySchema }),
  rateLimit({ getAccountKey: (req) => (req.body as LoginBody).email }),
  postLogin,
);

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
 *       429:
 *         description: Too many failed attempts for this caller or client address. Retry after the duration given in the `Retry-After` header.
 *         headers:
 *           Retry-After:
 *             schema: { type: integer }
 *             description: Seconds to wait before retrying.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
authRouter.patch(
  '/me/password',
  validate({ body: changePasswordBodySchema }),
  // Runs before `authenticate` deliberately: that middleware rejects a
  // bad/missing/expired token by responding directly, without calling
  // next(), so anything placed after it never sees that 401. Since this
  // route has no old-password check, authenticate failing is the *only*
  // way this route can produce a 401 - so the limiter has to sit upstream
  // of it to ever observe that failure at all.
  //
  // No account key: any identity read from an unverified token is exactly
  // as attacker-controlled as a spoofed X-Forwarded-For, so it would add
  // the appearance of per-account protection without the substance.
  // Address is what actually caps this - repeated bad tokens from one
  // caller, or switching over from a throttled /login.
  rateLimit({}),
  authenticate,
  patchMyPassword,
);
