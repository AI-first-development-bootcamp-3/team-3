import { Router } from 'express';
import { getMe, patchMyPassword, postLogin, postLogout } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';
import { logoutRateLimit } from '../middleware/writeRateLimit.middleware.js';
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
 *         description: Sets an httpOnly session cookie. JSON body is expiry plus profile only (no JWT).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expiresAt: { type: string, format: date-time }
 *                 user: { type: object }
 *       400:
 *         description: Malformed request body.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Wrong email/password.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Account exists but is inactive. Contact an administrator.
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
 *       423:
 *         description: This email is locked for sustained failed attempts. Identical whether or not the email is registered. Retry after the duration given in the `Retry-After` header.
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
 * /me:
 *   get:
 *     summary: Return the signed-in profile; also used to detect a deactivated session
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Public user profile.
 *       401:
 *         description: Missing/invalid session, or the account was deactivated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
authRouter.get('/me', authenticate, getMe);

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
/**
 * @openapi
 * /logout:
 *   post:
 *     summary: End the authenticated caller's session
 *     description: >
 *       Ends every session for the calling account, not only the one
 *       presented here - every token issued before this call stops being
 *       accepted, on every device. Idempotent: calling it again with a
 *       token that is still valid succeeds the same way.
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204:
 *         description: Session ended. No content.
 *       401:
 *         description: Missing, malformed, expired, or already-revoked token.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Too many logout requests from this client address. Retry after the duration given in the `Retry-After` header.
 *         headers:
 *           Retry-After:
 *             schema: { type: integer }
 *             description: Seconds to wait before retrying.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
authRouter.post(
  '/logout',
  // Ahead of `authenticate` on purpose, so the token verify and user-row read
  // that middleware performs are themselves behind the limiter rather than in
  // front of it. Address-keyed as a consequence - see the middleware's own
  // comment, and the same trade-off recorded on /me/password below.
  //
  // Deliberately NOT the `rateLimit` used by the credential routes below,
  // which an earlier autofix attempt wired onto this route: that one counts
  // only *failed* attempts, so a valid token collecting 204s would never be
  // counted, and its store is shared across credential routes by design - so
  // logging out would draw down the same budget as logging in.
  logoutRateLimit,
  authenticate,
  postLogout,
);

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
