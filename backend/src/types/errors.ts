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

  constructor(status: number, code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details) {
      this.details = details;
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

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static payloadTooLarge(message = 'Payload too large'): AppError {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', message);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
