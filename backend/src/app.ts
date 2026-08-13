import express from 'express';
import { errorHandler } from './middleware/error.middleware.js';

/**
 * The Express app, fully configured but never listening. Kept separate from
 * server.ts so tests can exercise it directly (e.g. with supertest) without
 * binding a real port.
 */
export const app = express();

app.use(express.json());

// Routes and the 404 handler are inserted here by later tasks — everything
// that can produce an AppError must be registered above errorHandler below.

// errorHandler must stay last: Express only routes to 4-arg middleware on error.
app.use(errorHandler);
