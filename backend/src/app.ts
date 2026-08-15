import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openApiSpec } from './config/swagger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { adminUserRouter } from './routes/adminUser.routes.js';
import { attachmentRouter } from './routes/attachment.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { sampleRouter } from './routes/sample.routes.js';

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
app.use(sampleRouter);
app.use(attachmentRouter);
app.use(authRouter);
app.use(adminUserRouter);

// Interactive docs leak endpoint shapes and are dev/QA tooling, not a
// production surface — disabled there by configuration.
if (env.NODE_ENV !== 'production') {
  app.get('/api-docs.json', (_req, res) => {
    res.json(openApiSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

// Feature routes are inserted here by later tasks, above notFoundHandler.

app.use(notFoundHandler);

// errorHandler must stay last: Express only routes to 4-arg middleware on error.
app.use(errorHandler);
