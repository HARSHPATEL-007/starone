import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { campaignSnapshotService } from "../services/CampaignSnapshotService";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess, sendCreated } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/capture",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId, name, description } = req.body;
    if (!campaignId || !name) throw new AppError(400, "Missing required fields: campaignId, name");
    const snapshot = await campaignSnapshotService.captureSnapshot(tenantId, campaignId, name, description);
    sendCreated(res, snapshot);
  })
);

router.get(
  "/compare",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id1, id2 } = req.query;
    if (!id1 || !id2) throw new AppError(400, "Missing query params: id1, id2");
    const result = await campaignSnapshotService.compareSnapshots(id1 as string, id2 as string, tenantId);
    const changes = typeof result === "object" && result ? Object.keys(result).filter(k => k !== "snapshotA" && k !== "snapshotB").length : 0;
    sendSuccess(res, result, { changesDetected: changes });
  })
);

router.get(
  "/timeline/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId } = req.params;
    const snapshots = await campaignSnapshotService.getSnapshotTimeline(tenantId, campaignId);
    sendSuccess(res, snapshots, { count: Array.isArray(snapshots) ? snapshots.length : 0 });
  })
);

router.post(
  "/auto-capture",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await DataStore.findCampaigns({ tenantId, status: "active" });
    const campaigns = result.campaigns || result;
    const snapshots: any[] = [];
    for (const campaign of campaigns) {
      const snapshot = await campaignSnapshotService.captureSnapshot(tenantId, campaign._id, `Auto-capture ${new Date().toISOString().split("T")[0]}`);
      snapshots.push(snapshot);
    }
    sendCreated(res, { captured: snapshots.length, snapshots }, { totalSnapshots: snapshots.length, campaignCount: campaigns.length });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const ok = DataStore.mem().delete("campaign_snapshots", (s: any) => s._id === id && s.tenantId === tenantId);
    if (!ok) throw new AppError(404, "Snapshot not found");
    res.status(204).send();
  })
);

export default router;
