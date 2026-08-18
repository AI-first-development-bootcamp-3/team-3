export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

/**
 * The one error shape every endpoint in the API throws and every client
 * receives. Thrown from anywhere (a route, a service, middleware), caught
 * once by the error-handling middleware, and serialised identically.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ErrorDetail[];
  /**
   * Seconds the client should wait before retrying — surfaced by the error
   * handler as a `Retry-After` header, never as part of the response body.
   */
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ErrorDetail[],
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details) {
      this.details = details;
    }
    if (retryAfterSeconds !== undefined) {
      this.retryAfterSeconds = retryAfterSeconds;
    }
    Error.captureStackTrace(this, AppError);
  }

  toResponseBody(): ErrorResponseBody {
    const body: ErrorResponseBody = {
      error: { code: this.code, message: this.message },
    };
    if (this.details) {
      body.error.details = this.details;
    }
    return body;
  }

  static badRequest(message: string, details?: ErrorDetail[]): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Not permitted'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, details?: ErrorDetail[]): AppError {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static payloadTooLarge(message = 'Payload too large'): AppError {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', message);
  }

  static tooManyRequests(
    retryAfterSeconds: number,
    message = 'Too many attempts. Please try again later.',
  ): AppError {
    return new AppError(429, 'TOO_MANY_REQUESTS', message, undefined, retryAfterSeconds);
  }

  /**
   * Distinct from tooManyRequests(429): this is the durable account-lockout
   * tier, not the in-memory throttle. Never conditioned on whether the
   * email is registered - see openspec/changes/login-account-lockout.
   */
  static locked(
    retryAfterSeconds: number,
    message = 'This account is temporarily locked due to too many failed attempts. Please try again later.',
  ): AppError {
    return new AppError(423, 'LOCKED', message, undefined, retryAfterSeconds);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
