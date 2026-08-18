import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { readRateLimit } from '../middleware/writeRateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { Role } from '../generated/prisma/enums.js';
import { echoBodySchema } from '../types/sample.schema.js';
import { getAdminOnly, getProtected, postEcho } from '../controllers/sample.controller.js';

/**
 * Demonstrates the validation middleware end to end over a real HTTP route:
 * a missing required field, a wrong-typed field, or several failures at
 * once all land in one 400 response shaped by the error contract.
 */
export const sampleRouter = Router();

sampleRouter.post('/sample/echo', validate({ body: echoBodySchema }), postEcho);

/**
 * Demonstrates the auth middlewares: `/sample/protected` requires any valid
 * token, `/sample/admin-only` additionally requires the ADMIN role.
 */
sampleRouter.get('/sample/protected', readRateLimit, authenticate, getProtected);
sampleRouter.get('/sample/admin-only', readRateLimit, authenticate, requireRole(Role.ADMIN), getAdminOnly);
