import { Router } from 'express';
import { deleteMyAbsence, getMyAbsences, postAbsence } from '../controllers/absence.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  authGuardRateLimit,
  readRateLimit,
  writeRateLimit,
} from '../middleware/writeRateLimit.middleware.js';
import {
  absenceIdParamSchema,
  createAbsenceBodySchema,
  listAbsencesQuerySchema,
} from '../types/absence.schema.js';

export const absenceRouter = Router();

/**
 * @openapi
 * /absences:
 *   post:
 *     summary: Create a full-day absence for the authenticated caller
 *     description: >
 *       Stores one absence row (`halfDay` false). Working-day count excludes
 *       Friday and Saturday. Conflicts with existing absences or reported
 *       hours return 409 with per-date details.
 *     tags: [Absences]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, startDate]
 *             properties:
 *               type: { type: string, enum: [VACATION, SICK, RESERVE_DUTY, OTHER] }
 *               startDate: { type: string, format: date, example: '2026-08-09' }
 *               endDate: { type: string, format: date, example: '2026-08-13', description: 'Inclusive; defaults to startDate' }
 *               attachmentIds: { type: array, items: { type: string, format: uuid }, description: 'UUIDs of previously uploaded attachments to link to this absence' }
 *     responses:
 *       201:
 *         description: The persisted absence including workingDayCount.
 *       400:
 *         description: Malformed body, inverted dates, or no working days in the range.
 *       401:
 *         description: Authentication required.
 *       409:
 *         description: Dates conflict with an existing absence or reported work hours.
 *       429:
 *         description: Too many writes from this caller.
 */
absenceRouter.post(
  '/absences',
  // Address-keyed guard first so `authenticate` itself is capped, then the
  // per-caller write budget once there is an identity to key it by.
  authGuardRateLimit,
  authenticate,
  writeRateLimit,
  validate({ body: createAbsenceBodySchema }),
  postAbsence,
);

/**
 * @openapi
 * /absences:
 *   get:
 *     summary: List the authenticated caller's absences that overlap one calendar month
 *     tags: [Absences]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Absences whose range overlaps the month.
 *       400:
 *         description: Invalid month or year.
 *       401:
 *         description: Authentication required.
 */
absenceRouter.get(
  '/absences',
  readRateLimit,
  authenticate,
  validate({ query: listAbsencesQuerySchema }),
  getMyAbsences,
);

/**
 * @openapi
 * /absences/{id}:
 *   delete:
 *     summary: Cancel one of the authenticated caller's absences
 *     description: >
 *       Soft-deletes the row (`isActive` false) so it stays in history.
 *       The whole date range is cancelled, not a single day inside it.
 *     tags: [Absences]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: The absence was cancelled.
 *       400:
 *         description: Malformed id.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: The absence belongs to another user.
 *       404:
 *         description: No active absence with that id.
 *       429:
 *         description: Too many writes from this caller.
 */
absenceRouter.delete(
  '/absences/:id',
  authGuardRateLimit,
  authenticate,
  writeRateLimit,
  validate({ params: absenceIdParamSchema }),
  deleteMyAbsence,
);
