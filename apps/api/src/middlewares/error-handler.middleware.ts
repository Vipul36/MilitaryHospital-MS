import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Prisma Client Known Request Error codes
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 */
const PRISMA_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  P2002: { status: 409, code: 'UNIQUE_CONSTRAINT_VIOLATION', message: 'A record with this value already exists.' },
  P2003: { status: 400, code: 'FOREIGN_KEY_CONSTRAINT', message: 'Related record not found.' },
  P2025: { status: 404, code: 'RECORD_NOT_FOUND', message: 'The requested record does not exist.' },
  P2014: { status: 400, code: 'RELATION_VIOLATION', message: 'The change would violate a required relation.' },
  P2016: { status: 400, code: 'QUERY_INTERPRETATION_ERROR', message: 'Query interpretation error.' },
};

/**
 * JWT Error name mapping
 */
const JWT_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  TokenExpiredError: { status: 401, code: 'TOKEN_EXPIRED', message: 'Authentication token has expired. Please login again.' },
  JsonWebTokenError: { status: 401, code: 'TOKEN_INVALID', message: 'Authentication token is invalid or malformed.' },
  NotBeforeError: { status: 401, code: 'TOKEN_NOT_ACTIVE', message: 'Authentication token is not yet active.' },
};

/**
 * Custom application error class for throwing structured errors from routes/services.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown[];

  constructor(statusCode: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Centralized Express Error Handler Middleware
 *
 * Maps known error types (Prisma, Zod, JWT, AppError) to structured JSON responses
 * following the project error response standard (§11 Error Response Standard).
 *
 * MUST be registered as the LAST middleware in app.ts.
 */
export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Default error shape
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred. Please try again later.';
  let details: unknown[] = [];

  // ── AppError (thrown intentionally by application code) ──
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }

  // ── Zod Validation Error ──
  else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed. Check the details for specific field errors.';
    details = ((err as any).issues || (err as any).errors || []).map((e: any) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : e.path,
      message: e.message,
      code: e.code,
    }));
  }

  // ── Prisma Known Request Error ──
  else if (err.constructor?.name === 'PrismaClientKnownRequestError' && 'code' in err) {
    const prismaCode = (err as any).code as string;
    const mapped = PRISMA_ERROR_MAP[prismaCode];
    if (mapped) {
      statusCode = mapped.status;
      code = mapped.code;
      message = mapped.message;
      // Include target fields for unique constraint violations
      if (prismaCode === 'P2002' && 'meta' in err) {
        const meta = (err as any).meta;
        details = [{ target: meta?.target }];
      }
    }
  }

  // ── JWT Errors ──
  else if (err.name in JWT_ERROR_MAP) {
    const mapped = JWT_ERROR_MAP[err.name];
    statusCode = mapped.status;
    code = mapped.code;
    message = mapped.message;
  }

  // ── SyntaxError (malformed JSON body) ──
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'The request body contains malformed JSON.';
  }

  // Log unexpected 500s to console for debugging
  if (statusCode === 500) {
    console.error('[ERROR]', new Date().toISOString(), {
      method: req.method,
      url: req.originalUrl,
      error: err.message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
}
