import { Router } from 'express';
import { getHolidays } from '../controllers/holiday.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { readRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { listHolidaysQuerySchema } from '../types/holiday.schema.js';

export const holidayRouter = Router();

/**
 * @openapi
 * /holidays:
 *   get:
 *     summary: List Israeli paid public holidays for a Gregorian year
 *     description: >
 *       Civil dates follow the Hebrew calendar for that year (including
 *       Yom HaAtzmaut postponement). Authenticated employees and admins.
 *     tags: [Holidays]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer, minimum: 2000, maximum: 2100 }
 *     responses:
 *       200:
 *         description: Holidays with Hebrew names and YYYY-MM-DD dates.
 *       400:
 *         description: Missing or invalid year.
 *       401:
 *         description: Authentication required.
 */
holidayRouter.get(
  '/holidays',
  readRateLimit,
  authenticate,
  validate({ query: listHolidaysQuerySchema }),
  getHolidays,
);
