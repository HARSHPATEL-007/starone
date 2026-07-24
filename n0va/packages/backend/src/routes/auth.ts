import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "n0va-transcendent-secret-2026-q3-change-in-production";
const JWT_EXPIRY = "24h";

interface StoredUser {
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  tenantId: string;
  userId: string;
}

const USERS: StoredUser[] = [];

async function seedUsers() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const managerHash = await bcrypt.hash("manager123", 12);
  const analystHash = await bcrypt.hash("analyst123", 12);
  USERS.push(
    { email: "admin@n0va.io", passwordHash: adminHash, name: "Jane Doe", role: "admin", tenantId: "tenant_001", userId: "user_001" },
    { email: "manager@n0va.io", passwordHash: managerHash, name: "John Smith", role: "manager", tenantId: "tenant_001", userId: "user_002" },
    { email: "analyst@n0va.io", passwordHash: analystHash, name: "Alice Wang", role: "analyst", tenantId: "tenant_001", userId: "user_003" },
  );
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError(400, "Email and password required");

    const user = USERS.find((u) => u.email === email);
    if (!user) throw new AppError(401, "Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, "Invalid email or password");

    const payload = { userId: user.userId, tenantId: user.tenantId, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY, algorithm: "HS256" });

    res.json({
      token,
      user: { name: user.name, email: user.email, role: user.role, userId: user.userId, tenantId: user.tenantId },
    });
  })
);

router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) throw new AppError(400, "Email, password, and name required");
    if (password.length < 6) throw new AppError(400, "Password must be at least 6 characters");

    if (USERS.find((u) => u.email === email)) throw new AppError(409, "Email already registered");

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser: StoredUser = {
      email,
      passwordHash,
      name,
      role: "analyst",
      tenantId: `tenant_${Date.now().toString(36)}`,
      userId: `user_${Date.now().toString(36)}`,
    };
    USERS.push(newUser);

    const payload = { userId: newUser.userId, tenantId: newUser.tenantId, role: newUser.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY, algorithm: "HS256" });

    res.status(201).json({
      token,
      user: { name: newUser.name, email: newUser.email, role: newUser.role, userId: newUser.userId, tenantId: newUser.tenantId },
    });
  })
);

router.get(
  "/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) throw new AppError(401, "Missing token");

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as any;
      res.json({ valid: true, userId: decoded.userId, tenantId: decoded.tenantId, role: decoded.role });
    } catch {
      throw new AppError(401, "Invalid or expired token");
    }
  })
);

seedUsers();
export default router;
export { JWT_SECRET };
