import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { healthRouter } from './routes/health.routes.js';

/**
 * The Express app, fully configured but never listening. Kept separate from
 * server.ts so tests can exercise it directly (e.g. with supertest) without
 * binding a real port.
 */
export const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(requestLogger);
app.use(express.json());

app.use(healthRouter);

// Feature routes are inserted here by later tasks, above notFoundHandler.

app.use(notFoundHandler);

// errorHandler must stay last: Express only routes to 4-arg middleware on error.
app.use(errorHandler);
