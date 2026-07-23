import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const payload = JSON.parse(decoded) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, "Invalid token format");
  }
}

export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const tenantId = req.headers["x-tenant-id"] as string;
  if (!tenantId) {
    throw new AppError(400, "Missing x-tenant-id header");
  }
  if (req.user) {
    req.user.tenantId = tenantId;
  }
  next();
}
