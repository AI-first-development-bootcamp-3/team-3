import express from 'express';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { healthRouter } from './routes/health.routes.js';

/**
 * The Express app, fully configured but never listening. Kept separate from
 * server.ts so tests can exercise it directly (e.g. with supertest) without
 * binding a real port.
 */
export const app = express();

app.use(express.json());

app.use(healthRouter);

// Feature routes are inserted here by later tasks, above notFoundHandler.

app.use(notFoundHandler);

// errorHandler must stay last: Express only routes to 4-arg middleware on error.
app.use(errorHandler);
