import { describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';

describe('AppError', () => {
  it('carries status, code, and message, and is a real Error', () => {
    const error = new AppError(418, 'TEAPOT', "I'm a teapot");

    expect(error.status).toBe(418);
    expect(error.code).toBe('TEAPOT');
    expect(error.message).toBe("I'm a teapot");
    expect(error).toBeInstanceOf(Error);
  });

  it('serialises without a details field when none is given', () => {
    expect(AppError.notFound('missing').toResponseBody()).toEqual({
      error: { code: 'NOT_FOUND', message: 'missing' },
    });
  });

  it('serialises with details when given', () => {
    const error = AppError.badRequest('invalid', [{ field: 'email', message: 'required' }]);

    expect(error.toResponseBody()).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'invalid',
        details: [{ field: 'email', message: 'required' }],
      },
    });
  });

  const cases: Array<[AppError, number, string]> = [
    [AppError.badRequest('x'), 400, 'BAD_REQUEST'],
    [AppError.unauthorized(), 401, 'UNAUTHORIZED'],
    [AppError.forbidden(), 403, 'FORBIDDEN'],
    [AppError.notFound(), 404, 'NOT_FOUND'],
    [AppError.conflict('x'), 409, 'CONFLICT'],
    [AppError.payloadTooLarge(), 413, 'PAYLOAD_TOO_LARGE'],
    [AppError.internal(), 500, 'INTERNAL_ERROR'],
  ];

  it.each(cases)('maps to status %i and code %s', (error, status, code) => {
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
  });

  it('provides sensible default messages for parameterless factories', () => {
    expect(AppError.unauthorized().message).toBe('Authentication required');
    expect(AppError.forbidden().message).toBe('Not permitted');
    expect(AppError.notFound().message).toBe('Resource not found');
    expect(AppError.payloadTooLarge().message).toBe('Payload too large');
    expect(AppError.internal().message).toBe('Internal server error');
  });
});
