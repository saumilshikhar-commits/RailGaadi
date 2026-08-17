import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { errorResponse } from '../api/response';

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json(
        errorResponse('INVALID_QUERY', 'Invalid query parameters', undefined, result.error.format()),
      );
      return;
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json(
        errorResponse('INVALID_PARAMS', 'Invalid path parameters', undefined, result.error.format()),
      );
      return;
    }
    (req as any).validatedParams = result.data;
    next();
  };
}

// Common schemas
export const trainIdParamSchema = z.object({
  trainId: z.string().min(1).max(20).regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid train ID'),
});

export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Query too short').max(100, 'Query too long'),
});

export const contextQuerySchema = z.object({
  categories: z.string().optional(), // comma-separated
});
