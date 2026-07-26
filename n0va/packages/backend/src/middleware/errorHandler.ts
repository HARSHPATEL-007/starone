import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
    public details?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(public fieldErrors: Record<string, string[]>) {
    super(400, "Validation failed", true, { fields: fieldErrors });
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? `${resource} with id '${id}' not found` : `${resource} not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      status: err.statusCode,
      operational: err.isOperational,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err.name === "ValidationError" || err.name === "CastError") {
    res.status(400).json({
      error: err.message,
      status: 400,
      operational: true,
    });
    return;
  }

  if ((err as any).code === 11000) {
    res.status(409).json({
      error: "Duplicate key error",
      status: 409,
      operational: true,
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    status: 500,
    operational: false,
  });
}
