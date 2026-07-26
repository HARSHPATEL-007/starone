import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

const JWT_SECRET = process.env.JWT_SECRET || "n0va-transcendent-secret-2026-q3-change-in-production";

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

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  analyst: 2,
  manager: 3,
  admin: 4,
};

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw new AppError(401, "Token expired");
    }
    throw new AppError(401, "Invalid token");
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

export function requireRole(minimumRole: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? Infinity;
    if (userLevel < requiredLevel) {
      throw new AppError(403, `Insufficient permissions. Required role: ${minimumRole}`);
    }
    next();
  };
}

export { JWT_SECRET };
