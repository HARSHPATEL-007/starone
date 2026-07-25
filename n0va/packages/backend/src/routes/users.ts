import { Router, Request, Response, NextFunction } from "express";
import { USERS, isConnected } from "./auth";
import { User } from "../models/User";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user!;
    if (isConnected()) {
      const user = await User.findById(userId).select("-passwordHash");
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ name: user.name, email: user.email, role: user.role, userId: user._id.toString(), tenantId: user.tenantId });
    }
    const user = USERS.find((u) => u.userId === userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ name: user.name, email: user.email, role: user.role, userId: user.userId, tenantId: user.tenantId });
  })
);

router.patch(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { name, email } = req.body;
    if (isConnected()) {
      const updates: Record<string, any> = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select("-passwordHash");
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ name: user.name, email: user.email, role: user.role, userId: user._id.toString(), tenantId: user.tenantId });
    }
    const user = USERS.find((u) => u.userId === userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (name) user.name = name;
    if (email) user.email = email;
    res.json({ name: user.name, email: user.email, role: user.role, userId: user.userId, tenantId: user.tenantId });
  })
);

export default router;
