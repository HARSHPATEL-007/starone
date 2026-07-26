import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const kits = await DataStore.findMediaKits({ tenantId });
    sendSuccess(res, kits, { count: kits.length });
  })
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name, description } = req.body;
    if (!name || !description) throw new AppError(400, "Missing required fields: name, description");
    const kit = await DataStore.createMediaKit({ tenantId, name, description, version: 1, assets: [], reach: 0, contacts: [], tags: [] });
    sendCreated(res, kit);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { name, description, version, assets, reach, contacts, tags } = req.body;
    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (version !== undefined) update.version = version;
    if (assets !== undefined) update.assets = assets;
    if (reach !== undefined) update.reach = reach;
    if (contacts !== undefined) update.contacts = contacts;
    if (tags !== undefined) update.tags = tags;
    const updated = await DataStore.updateMediaKit(id, tenantId, update);
    if (!updated) throw new AppError(404, "Media kit not found");
    sendSuccess(res, updated);
  })
);

router.get(
  "/orchestrate/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const kits = DataStore.mem().find("media_kits", (k: any) => k.tenantId === tenantId);
    const totalKits = kits.length;
    const totalReach = kits.reduce((sum: number, k: any) => sum + (k.reach || 0), 0);
    const avgReach = totalKits > 0 ? Math.round(totalReach / totalKits) : 0;
    const versions = [...new Set(kits.map((k: any) => k.version).filter(Boolean))];
    sendSuccess(res, { totalKits, avgReach, versions: versions.length });
  })
);

export default router;
