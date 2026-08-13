import type { RequestHandler } from 'express';
import { AppError } from '../types/errors.js';

/**
 * Registered after every route. Anything that reaches here matched no
 * route, so it's forwarded to errorHandler as a 404 in the standard shape
 * rather than Express's default HTML error page.
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
};
