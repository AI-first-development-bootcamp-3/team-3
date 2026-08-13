import { Router } from 'express';
import { validate } from '../middleware/validate.middleware.js';
import { echoBodySchema } from '../types/sample.schema.js';
import { postEcho } from '../controllers/sample.controller.js';

/**
 * Demonstrates the validation middleware end to end over a real HTTP route:
 * a missing required field, a wrong-typed field, or several failures at
 * once all land in one 400 response shaped by the error contract.
 */
export const sampleRouter = Router();

sampleRouter.post('/sample/echo', validate({ body: echoBodySchema }), postEcho);
