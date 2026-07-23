import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const MOCK_USERS = [
  { email: "admin@n0va.io", password: "admin123", name: "Jane Doe", role: "admin", tenantId: "tenant_001", userId: "user_001" },
  { email: "manager@n0va.io", password: "manager123", name: "John Smith", role: "manager", tenantId: "tenant_001", userId: "user_002" },
  { email: "analyst@n0va.io", password: "analyst123", name: "Alice Wang", role: "analyst", tenantId: "tenant_001", userId: "user_003" },
];

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError(400, "Email and password required");

    const user = MOCK_USERS.find((u) => u.email === email && u.password === password);
    if (!user) throw new AppError(401, "Invalid email or password");

    const token = Buffer.from(JSON.stringify({
      userId: user.userId,
      tenantId: user.tenantId,
      role: user.role,
    })).toString("base64");

    res.json({
      token,
      user: { name: user.name, email: user.email, role: user.role, userId: user.userId, tenantId: user.tenantId },
    });
  })
);

export default router;
