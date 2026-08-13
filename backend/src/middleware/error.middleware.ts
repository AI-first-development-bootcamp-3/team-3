import type { ErrorRequestHandler } from 'express';
import { AppError } from '../types/errors.js';

/**
 * The single place that turns any thrown error into the API's standard JSON
 * shape. Must be registered last, after every route — Express only invokes
 * 4-arg middleware like this one for errors.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(err.toResponseBody());
    return;
  }

  // Unexpected error: the client gets a generic message, but the full
  // detail — stack trace and all — is logged for whoever's debugging this.
  console.error('Unhandled error:', err);

  const fallback = AppError.internal();
  res.status(fallback.status).json(fallback.toResponseBody());
};
