import { Router, Request, Response, NextFunction } from "express";
import { creativeVersionService } from "../services/CreativeVersionService";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get(
  "/:creativeId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const versions = creativeVersionService.getVersions(req.params.creativeId, tenantId);
    const arr = Array.isArray(versions) ? versions : [];
    sendSuccess(res, arr, { count: arr.length, creativeId: req.params.creativeId });
  })
);

router.post(
  "/:creativeId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { snapshot, changeDescription } = req.body;
    if (!snapshot) return res.status(400).json({ error: "snapshot is required" });
    const entry = creativeVersionService.createVersion(
      req.params.creativeId, tenantId, snapshot,
      changeDescription || "Updated", req.user!.userId,
    );
    sendCreated(res, entry);
  })
);

router.get(
  "/:creativeId/latest",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const latest = creativeVersionService.getLatestVersion(req.params.creativeId, tenantId);
    if (!latest) return res.status(404).json({ error: "No versions found" });
    sendSuccess(res, latest);
  })
);

router.delete(
  "/:versionId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const ok = creativeVersionService.deleteVersion(req.params.versionId, tenantId);
    if (!ok) return res.status(404).json({ error: "Version not found" });
    sendSuccess(res, { success: true });
  })
);

export default router;
