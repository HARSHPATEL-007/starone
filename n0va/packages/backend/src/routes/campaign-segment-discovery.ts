import { Router, Request, Response, NextFunction } from "express";
import { campaignSegmentDiscovery } from "../services/CampaignSegmentDiscoveryService";
import { sendSuccess } from "./route-utils";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

const router = Router();

router.get("/segments", asyncHandler(async (req, res) => {
  const result = campaignSegmentDiscovery.discoverSegments(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-performance", asyncHandler(async (req, res) => {
  const result = campaignSegmentDiscovery.analyzeSegmentPerformance(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-targeting", asyncHandler(async (req, res) => {
  const result = campaignSegmentDiscovery.recommendSegmentTargeting(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-comparison", asyncHandler(async (req, res) => {
  const result = campaignSegmentDiscovery.compareSegments(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-trends", asyncHandler(async (req, res) => {
  const result = campaignSegmentDiscovery.segmentTrends(req.user!.tenantId);
  sendSuccess(res, result);
}));

router.get("/segment-overlap", asyncHandler(async (req, res) => {
  const result = campaignSegmentDiscovery.segmentOverlapAnalysis(req.user!.tenantId);
  sendSuccess(res, result);
}));

export default router;
