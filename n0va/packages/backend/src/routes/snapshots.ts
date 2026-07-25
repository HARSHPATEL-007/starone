import { Router, Request, Response, NextFunction } from "express";
import { DataStore } from "../services/DataStore";
import { campaignSnapshotService } from "../services/CampaignSnapshotService";
import { AppError } from "../middleware/errorHandler";

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
    res.status(201).json(snapshot);
  })
);

router.get(
  "/compare",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id1, id2 } = req.query;
    if (!id1 || !id2) throw new AppError(400, "Missing query params: id1, id2");
    const result = await campaignSnapshotService.compareSnapshots(id1 as string, id2 as string, tenantId);
    res.json(result);
  })
);

router.get(
  "/timeline/:campaignId",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { campaignId } = req.params;
    const snapshots = await campaignSnapshotService.getSnapshotTimeline(tenantId, campaignId);
    res.json(snapshots);
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
      const snapshot = await campaignSnapshotService.captureSnapshot(
        tenantId,
        campaign._id,
        `Auto-capture ${new Date().toISOString().split("T")[0]}`
      );
      snapshots.push(snapshot);
    }
    res.json({ captured: snapshots.length, snapshots });
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
