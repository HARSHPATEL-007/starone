import { Router, Request, Response, NextFunction } from "express";
import { audienceInsightsService } from "../services/AudienceInsightsService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/pca",
  asyncHandler(async (req: Request, res: Response) => {
    const { data, nComponents } = req.body;
    if (!data || !Array.isArray(data)) return res.status(400).json({ error: "data array required" });
    const result = audienceInsightsService.pca(data, nComponents || 2);
    sendSuccess(res, result, { points: result.projected.length, dims: result.loadings.length });
  }),
);

router.post(
  "/gmm",
  asyncHandler(async (req: Request, res: Response) => {
    const { data, k } = req.body;
    if (!data || !Array.isArray(data)) return res.status(400).json({ error: "data array required" });
    const result = audienceInsightsService.gmmClustering(data, k || 3);
    sendSuccess(res, result, { points: data.length, clusters: k || 3 });
  }),
);

router.post(
  "/rfm",
  asyncHandler(async (req: Request, res: Response) => {
    const { customers } = req.body;
    if (!customers || !Array.isArray(customers)) return res.status(400).json({ error: "customers array required" });
    const result = audienceInsightsService.computeRFM(customers);
    sendSuccess(res, result, { count: result.length });
  }),
);

router.post(
  "/lookalike",
  asyncHandler(async (req: Request, res: Response) => {
    const { seedAudience, candidatePool, targetSize } = req.body;
    if (!seedAudience || !candidatePool) return res.status(400).json({ error: "seedAudience and candidatePool required" });
    const result = audienceInsightsService.generateLookalike(seedAudience, candidatePool, targetSize || 100);
    sendSuccess(res, result, { candidatesCount: result.candidates.length });
  }),
);

export default router;
