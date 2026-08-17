import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError } from '../../types/errors.js';
import { validate } from '../validate.middleware.js';

function makeRes(): Response {
  return {} as Response;
}

describe('validate middleware', () => {
  const bodySchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('passes valid input through and replaces the payload with parsed data', () => {
    const req = { body: { name: 'Dana', age: 30, extra: 'strip me' } } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;

    validate({ body: bodySchema })(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Dana', age: 30 });
  });

  it('rejects a missing required field with a named 400 detail', () => {
    const req = { body: { age: 30 } } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;

    validate({ body: bodySchema })(req, makeRes(), next);

    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(400);
    expect(error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    );
  });

  it('rejects a wrong-typed field, naming the offending field', () => {
    const req = { body: { name: 'Dana', age: 'thirty' } } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;

    validate({ body: bodySchema })(req, makeRes(), next);

    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'age' })]),
    );
  });

  it('reports every failing field in one response, not just the first', () => {
    const schema = z.object({ a: z.string(), b: z.string(), c: z.string() });
    const req = { body: {} } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;

    validate({ body: schema })(req, makeRes(), next);

    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(error.details).toHaveLength(3);
  });

  it('validates params and query independently, merging failures together', () => {
    const req = {
      body: {},
      params: { id: 'not-a-uuid' },
      query: { page: 'nope' },
    } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;

    validate({
      params: z.object({ id: z.string().uuid() }),
      query: z.object({ page: z.coerce.number() }),
    })(req, makeRes(), next);

    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(error.details?.map((d) => d.field)).toEqual(expect.arrayContaining(['id']));
  });

  it('coerces validated query params onto the request', () => {
    const req = { query: { page: '2' } } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;

    validate({ query: z.object({ page: z.coerce.number() }) })(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 2 });
  });
});
