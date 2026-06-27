import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error]', err.message);
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
  });
};
