import { Router, Request, Response, NextFunction } from "express";
import { cdpService } from "../services/CDPService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.get("/stats", asyncHandler(async (req, res) => res.json(cdpService.getStats(req.user!.tenantId))));
router.get("/profiles", asyncHandler(async (req, res) => { const { search, segment } = req.query; res.json(cdpService.getProfiles(req.user!.tenantId, search as string, segment as string)); }));
router.get("/profiles/:id", asyncHandler(async (req, res) => { const p = cdpService.getProfile(req.user!.tenantId, req.params.id); if (!p) throw new AppError(404, "Profile not found"); res.json(p); }));
router.patch("/profiles/:id", asyncHandler(async (req, res) => { const p = cdpService.updateProfile(req.user!.tenantId, req.params.id, req.body); if (!p) throw new AppError(404, "Profile not found"); res.json(p); }));
router.get("/events", asyncHandler(async (req, res) => { const { profileId, type, limit } = req.query; res.json(cdpService.getEvents(req.user!.tenantId, profileId as string, type as string, limit ? Number(limit) : 50)); }));
router.get("/event-types", asyncHandler(async (req, res) => res.json(cdpService.getEventTypes(req.user!.tenantId))));
router.get("/event-type-stats", asyncHandler(async (req, res) => res.json(cdpService.getEventTypeStats(req.user!.tenantId))));
router.post("/events", asyncHandler(async (req, res) => { const { profileId, type, properties, channel, source, campaignId } = req.body; if (!profileId || !type) throw new AppError(400, "Missing required fields"); res.status(201).json(cdpService.trackEvent(req.user!.tenantId, { profileId, type, properties, channel, source, campaignId })); }));
router.get("/segments", asyncHandler(async (req, res) => res.json(cdpService.getSegments(req.user!.tenantId))));
router.patch("/segments/:id", asyncHandler(async (req, res) => { const s = cdpService.updateSegment(req.user!.tenantId, req.params.id, req.body); if (!s) throw new AppError(404, "Segment not found"); res.json(s); }));
router.delete("/segments/:id", asyncHandler(async (req, res) => { cdpService.deleteSegment(req.user!.tenantId, req.params.id); res.status(204).send(); }));

export default router;
