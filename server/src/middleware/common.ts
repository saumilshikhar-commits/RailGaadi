import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const id = (req.headers['x-request-id'] as string) ?? uuidv4();
  (req as any).requestId = id;
  res.setHeader('X-Request-Id', id);

  // Set response time BEFORE the response is sent (not after)
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Only set if headers haven't been sent yet (they have been, but we can use a custom property)
    try {
      // This is safe: we're reading, not writing headers. Log only.
      if (process.env.NODE_ENV === 'development') {
        process.stdout.write(`[${id.slice(0, 8)}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms\n`);
      }
    } catch {
      // Ignore logging errors
    }
  });

  next();
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    data: null,
    meta: { requestId: (req as any).requestId ?? uuidv4() },
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  console.error('[ErrorHandler]', err);
  res.status(500).json({
    data: null,
    meta: { requestId: (req as any).requestId ?? uuidv4() },
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
}
