import { Router, Request, Response, NextFunction } from "express";
import { N0VA1OService } from "../services/N0VA1OService";
import { AppError } from "../middleware/errorHandler";
import { DataStore } from "../services/DataStore";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();
const n0va1oService = new N0VA1OService();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const platforms = await n0va1oService.getPlatforms();
    sendSuccess(res, platforms, { count: Array.isArray(platforms) ? platforms.length : 0 });
  })
);

router.get(
  "/connected",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    let accounts: any[];
    if (DataStore.usingMemory()) {
      accounts = DataStore["mem"]().find("connected_accounts", (a: any) => a.tenantId === tenantId);
    } else {
      const { ConnectedAccountModel } = require("../models/ConnectedAccount");
      accounts = await ConnectedAccountModel.find({ tenantId });
    }
    sendSuccess(res, accounts, { count: Array.isArray(accounts) ? accounts.length : 0 });
  })
);

router.post(
  "/connect",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { platform, label, accessToken, scopes } = req.body;
    if (!platform || !accessToken) throw new AppError(400, "Missing required fields: platform, accessToken");

    let account: any;
    if (DataStore.usingMemory()) {
      account = DataStore["mem"]().insert("connected_accounts", {
        tenantId,
        platform,
        label: label || platform,
        status: "active",
        credentials: { accessToken, scopes: scopes || ["read", "write"], expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() },
        metadata: {},
      });
    } else {
      account = await n0va1oService.connectAccount(tenantId, platform, label || platform, {
        accessToken,
        scopes: scopes || ["read", "write"],
      });
    }
    sendCreated(res, account);
  })
);

router.post(
  "/execute",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { platform, action, params } = req.body;
    if (!platform || !action) throw new AppError(400, "Missing required fields: platform, action");
    const result = await n0va1oService.executeAction(tenantId, platform, action, params || {});
    sendSuccess(res, result);
  })
);

router.delete(
  "/connected/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    if (DataStore.usingMemory()) {
      const ok = DataStore["mem"]().delete("connected_accounts", (a: any) => a._id === id && a.tenantId === tenantId);
      if (!ok) throw new AppError(404, "Connected account not found");
    } else {
      const { ConnectedAccountModel } = require("../models/ConnectedAccount");
      const deleted = await ConnectedAccountModel.findOneAndDelete({ _id: id, tenantId });
      if (!deleted) throw new AppError(404, "Connected account not found");
    }
    res.status(204).send();
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const platforms = await n0va1oService.getPlatforms();
    const platform = platforms.find((p: any) => p._id === req.params.id || p.id === req.params.id || p.name === req.params.id);
    if (!platform) throw new AppError(404, "Platform not found");
    sendSuccess(res, platform);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    if (DataStore.usingMemory()) {
      const updated = DataStore["mem"]().update("connected_accounts", (a: any) => a._id === id && a.tenantId === tenantId, req.body);
      if (!updated) throw new AppError(404, "Connected account not found");
      return sendSuccess(res, updated);
    }
    const { ConnectedAccountModel } = require("../models/ConnectedAccount");
    const updated = await ConnectedAccountModel.findOneAndUpdate(
      { _id: id, tenantId }, { $set: req.body }, { new: true }
    );
    if (!updated) throw new AppError(404, "Connected account not found");
    sendSuccess(res, updated);
  })
);

router.get(
  "/health",
  asyncHandler(async (_req: Request, res: Response) => {
    const health = n0va1oService.getGatewayHealth();
    sendSuccess(res, health);
  })
);

export default router;
