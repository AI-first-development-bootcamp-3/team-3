import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { AppError, type ErrorDetail } from '../types/errors.js';

export interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

function issuesToDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Validates body/params/query against the supplied schemas and replaces each
 * with its parsed (and stripped) result, so downstream code only ever sees
 * trusted, typed data. All schema violations across all three are collected
 * into a single 400 response rather than failing on the first.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: ErrorDetail[] = [];

    for (const [key, schema] of Object.entries(schemas) as [keyof ValidationSchemas, ZodType | undefined][]) {
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (result.success) {
        req[key] = result.data;
      } else {
        details.push(...issuesToDetails(result.error));
      }
    }

    if (details.length > 0) {
      next(AppError.badRequest('Request validation failed', details));
      return;
    }

    next();
  };
}
