import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation targets — which parts of the request to validate.
 */
interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Reusable Zod Validation Middleware Factory
 *
 * Accepts Zod schemas for body, query, and/or params.
 * On validation failure, passes a ZodError to the global error handler.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { validate } from '../middlewares/validate.middleware';
 *
 * const createPatientSchema = z.object({
 *   defenceId: z.string().min(1),
 *   name: z.string().min(2),
 *   phone: z.string().regex(/^\+?\d{10,15}$/),
 * });
 *
 * router.post('/', validate({ body: createPatientSchema }), createPatientHandler);
 * ```
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: ZodError[] = [];

    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
    } catch (err) {
      if (err instanceof ZodError) errors.push(err);
    }

    try {
      if (schemas.query) {
        (req as any).query = schemas.query.parse(req.query);
      }
    } catch (err) {
      if (err instanceof ZodError) errors.push(err);
    }

    try {
      if (schemas.params) {
        (req as any).params = schemas.params.parse(req.params);
      }
    } catch (err) {
      if (err instanceof ZodError) errors.push(err);
    }

    if (errors.length > 0) {
      // Merge all ZodErrors into a single error with combined issues
      const combined = new ZodError(errors.flatMap((e) => e.issues));
      return next(combined);
    }

    next();
  };
}
