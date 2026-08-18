import { Router } from 'express';
import {
  getMyClockSession,
  postClockComplete,
  postClockDiscard,
  postClockStart,
  postClockStop,
} from '../controllers/workClock.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  authGuardRateLimit,
  readRateLimit,
  writeRateLimit,
} from '../middleware/writeRateLimit.middleware.js';

export const workClockRouter = Router();

/**
 * @openapi
 * /me/clock/session:
 *   get:
 *     summary: Current work clock session for the authenticated employee
 *     tags: [Work clock]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Active or awaiting-confirm session, or null.
 *       401:
 *         description: Authentication required.
 */
workClockRouter.get('/me/clock/session', readRateLimit, authenticate, getMyClockSession);

/**
 * @openapi
 * /me/clock/start:
 *   post:
 *     summary: Start a work clock session
 *     tags: [Work clock]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Session started.
 *       409:
 *         description: Month locked, no assignments, full-day absence, or session already open.
 *       401:
 *         description: Authentication required.
 */
workClockRouter.post(
  '/me/clock/start',
  authGuardRateLimit,
  authenticate,
  writeRateLimit,
  postClockStart,
);

/**
 * @openapi
 * /me/clock/stop:
 *   post:
 *     summary: Stop the active clock into an awaiting-confirm draft
 *     tags: [Work clock]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Stopped with segment times for confirm modal.
 *       404:
 *         description: No active session.
 *       409:
 *         description: Month locked.
 *       401:
 *         description: Authentication required.
 */
workClockRouter.post(
  '/me/clock/stop',
  authGuardRateLimit,
  authenticate,
  writeRateLimit,
  postClockStop,
);

/**
 * @openapi
 * /me/clock/discard:
 *   post:
 *     summary: Discard an awaiting-confirm clock draft without saving a report
 *     tags: [Work clock]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204:
 *         description: Draft discarded.
 *       404:
 *         description: No draft to discard.
 *       401:
 *         description: Authentication required.
 */
workClockRouter.post(
  '/me/clock/discard',
  authGuardRateLimit,
  authenticate,
  writeRateLimit,
  postClockDiscard,
);

/**
 * @openapi
 * /me/clock/complete:
 *   post:
 *     summary: Clear awaiting-confirm session after reports were saved
 *     tags: [Work clock]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204:
 *         description: Session cleared.
 *       401:
 *         description: Authentication required.
 */
workClockRouter.post(
  '/me/clock/complete',
  authGuardRateLimit,
  authenticate,
  writeRateLimit,
  postClockComplete,
);
