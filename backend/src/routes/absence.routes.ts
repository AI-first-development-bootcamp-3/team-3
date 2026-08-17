import { Router } from 'express';
import { postAbsence } from '../controllers/absence.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createAbsenceBodySchema } from '../types/absence.schema.js';

export const absenceRouter = Router();

/**
 * @openapi
 * /absences:
 *   post:
 *     summary: Report an absence for the authenticated employee
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
 *               startDate: { type: string, format: date, example: '2026-08-16' }
 *               endDate: { type: string, format: date, description: 'Optional - defaults to startDate for a single-day absence', example: '2026-08-18' }
 *               halfDay: { type: boolean, description: 'Optional, defaults to false', default: false }
 *     responses:
 *       201:
 *         description: The persisted absence, including the computed working-day count.
 *       400:
 *         description: Malformed body, or endDate before startDate.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: The requested dates conflict with an existing absence or reported work hours. `error.details` names each clashing date.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
absenceRouter.post('/absences', authenticate, validate({ body: createAbsenceBodySchema }), postAbsence);